// NodeRenderer.stream-handlers.test.ts — event handlers that arrive AFTER their
// node mounted. streamSpec() mounts a node as soon as its type/props parse, so
// an `on_*` key can land on an already-mounted NodeRenderer. Each test holds the
// stream at a gate just before the handler key, proves the widget is on screen,
// releases the rest, then fires the event and expects the spec's action to run.
// Covers the explicit handlers (on_click, on_change behind a bind, on_input) and
// one generic `on_*` key routed through extraHandlers (chip on_close).

import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { streamSpec } from '$lib/streaming/index.js';

/** Stream `json` in two chunks split right before `"<key>"`; the second chunk
 *  waits until `mounted()` sees the widget, so the node is live without its key. */
async function streamWithLateKey(spec: object, key: string, mounted: () => unknown) {
	const json = JSON.stringify(spec);
	const cut = json.indexOf(`"${key}"`);
	expect(cut, `spec has no ${key}`).toBeGreaterThan(0);

	let release!: () => void;
	const gate = new Promise<void>((r) => (release = r));
	async function* source() {
		yield json.slice(0, cut);
		await gate;
		yield json.slice(cut);
	}

	const store = streamSpec(source(), { throttleMs: 0 });
	const onStateChange = vi.fn();
	const result = render(Ripple, { props: { streaming: store, onStateChange } });

	await vi.waitFor(() => expect(mounted()).toBeTruthy());
	expect((store.current as { ui: Record<string, unknown> }).ui[key]).toBeUndefined();

	release();
	await vi.waitFor(() => expect(store.done).toBe(true));
	await tick();
	expect(store.error).toBeNull();
	return { ...result, onStateChange, lastState: () => onStateChange.mock.calls.at(-1)?.[2] };
}

test('streamed button fires an on_click that arrived after the button mounted', async () => {
	const { lastState } = await streamWithLateKey(
		{
			state: { items: [] },
			ui: {
				type: 'button',
				props: { label: 'Add' },
				on_click: { action: 'push', target: 'items', value: 'x' }
			}
		},
		'on_click',
		() => screen.queryByRole('button', { name: 'Add' })
	);

	await userEvent.click(screen.getByRole('button', { name: 'Add' }));
	expect(lastState()).toMatchObject({ items: ['x'] });
});

test('streamed bound input runs an on_change that arrived after it mounted', async () => {
	const { lastState } = await streamWithLateKey(
		{
			state: { name: '', mirrored: '' },
			ui: {
				type: 'input',
				bind: '{state.name}',
				props: { placeholder: 'name' },
				on_change: { action: 'set', target: 'mirrored', value: '{state.name}' }
			}
		},
		'on_change',
		() => screen.queryByPlaceholderText('name')
	);

	await userEvent.type(screen.getByPlaceholderText('name'), 'x');
	expect(lastState()).toMatchObject({ name: 'x', mirrored: 'x' });
});

test('streamed unbound input runs an on_input that arrived after it mounted', async () => {
	const { lastState } = await streamWithLateKey(
		{
			state: { typed: false },
			ui: {
				type: 'input',
				props: { placeholder: 'q' },
				on_input: { action: 'set', target: 'typed', value: true }
			}
		},
		'on_input',
		() => screen.queryByPlaceholderText('q')
	);

	await userEvent.type(screen.getByPlaceholderText('q'), 'a');
	expect(lastState()).toMatchObject({ typed: true });
});

test('streamed chip runs a generic on_close that arrived after it mounted', async () => {
	const { lastState } = await streamWithLateKey(
		{
			state: { closed: false },
			ui: {
				type: 'chip',
				props: { label: 'tag', closable: true },
				on_close: { action: 'set', target: 'closed', value: true }
			}
		},
		'on_close',
		() => screen.queryByLabelText('Remove')
	);

	await userEvent.click(screen.getByLabelText('Remove'));
	expect(lastState()).toMatchObject({ closed: true });
});
