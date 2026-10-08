// NodeRenderer.stream-each.test.ts — rows of an `each` loop stay live after a
// streamed render. streamSpec() mounts the loop while its children are still
// arriving; once the stream is done, ticking a row's bound checkbox must update
// that row's own text, read through `{item.done}` or `{state.items[index].done}`.
// The whole-spec mount is the control: same spec, no streaming.
// What this guards: Ripple's spec.state sync must not share objects with live
// state. If live state and the sync's "last synced" copy are the same object
// (the stream store's $state proxy), a user write reads as a spec change and is
// reverted, so the row shows the old value. The streamed spec stays unwritten.

import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { describe, expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { streamSpec } from '$lib/streaming/index.js';

const rowSpec = (textExpr: string) => ({
	state: { items: [{ done: false }, { done: false }] },
	ui: {
		type: 'flex',
		props: { direction: 'column' },
		children: [
			{
				type: 'each',
				items: '{state.items}',
				children: [
					{
						type: 'flex',
						props: { direction: 'row' },
						children: [
							{ type: 'checkbox', bind: 'items.{index}.done', props: { label: 'Row' } },
							{ type: 'text', props: { text: `row {index}: ${textExpr}` } }
						]
					}
				]
			}
		]
	}
});

/** Small chunks with a macrotask between each, so every partial spec renders:
 *  the state lands first, then the loop node, then its children piece by piece. */
async function* chunked(json: string, size = 12) {
	for (let i = 0; i < json.length; i += size) {
		yield json.slice(i, i + size);
		await new Promise((r) => setTimeout(r, 0));
	}
}

async function mountStreamed(spec: object) {
	const store = streamSpec(chunked(JSON.stringify(spec)), { throttleMs: 0 });
	render(Ripple, { props: { streaming: store } });
	await vi.waitFor(() => expect(store.done).toBe(true), { timeout: 5000 });
	await tick();
	expect(store.error).toBeNull();
	return store;
}

const rowText = (i: number) => screen.getByText((t) => t.startsWith(`row ${i}:`)).textContent;

describe.each([
	['{item.done}', '{item.done}'],
	['{state.items[index].done}', '{state.items[index].done}']
])('each row reading %s', (_label, expr) => {
	test('mounted whole, ticking row 0 updates its text', async () => {
		render(Ripple, { props: { spec: rowSpec(expr) } });
		await tick();
		expect(rowText(0)).toBe('row 0: false');
		await userEvent.click(screen.getAllByRole('checkbox')[0]);
		await vi.waitFor(() => expect(rowText(0)).toBe('row 0: true'));
		expect(rowText(1)).toBe('row 1: false');
	});

	test('after streaming, ticking row 0 updates its text', async () => {
		const store = await mountStreamed(rowSpec(expr));
		expect(rowText(0)).toBe('row 0: false');
		await userEvent.click(screen.getAllByRole('checkbox')[0]);
		await vi.waitFor(() => expect(rowText(0)).toBe('row 0: true'));
		expect(rowText(1)).toBe('row 1: false');
		const streamed = store.current as unknown as { state: { items: { done: boolean }[] } };
		expect(streamed.state.items[0].done).toBe(false);
	});
});
