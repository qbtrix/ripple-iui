// stream-spec.mid-stream-display.test.ts — what a visitor sees between chunks.
// Two defects seen on every /live scenario and every chat card on the site:
// 1. Each new child object parses as `{}` until its `"type"` string closes, and
//    NodeRenderer paints the red "Widget type "" isn't in the catalog" box for
//    it, flashing once per node while the stream is open.
// 2. A string prop that ends inside an expression (`"{state.bill * (1 + st`)
//    has no closing brace, so the resolver leaves it alone and the raw formula
//    shows as text until the `}` arrives and it snaps to a number.
// Drives a real streamSpec() store through Ripple with a hand-fed stream, so
// each frame is exactly the prefix the test pushed.

import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { streamSpec } from '$lib/streaming/index.js';
import type { StreamSpecStore } from '$lib/streaming/index.js';

function openStream(): { stream: ReadableStream<string>; push: ReadableStreamDefaultController<string> } {
	let push!: ReadableStreamDefaultController<string>;
	const stream = new ReadableStream<string>({ start: (c) => void (push = c) });
	return { stream, push };
}

function mount() {
	const { stream, push } = openStream();
	const store = streamSpec(stream, { throttleMs: 0 });
	const { container } = render(Ripple, { props: { streaming: store } });
	return { store, push, container };
}

/** Feeds `chunk`, waits until the store has parsed the whole buffer so far. */
async function feed(store: StreamSpecStore, push: ReadableStreamDefaultController<string>, chunk: string, settled: () => void) {
	push.enqueue(chunk);
	await vi.waitFor(settled);
	expect(store.done).toBe(false);
}

const childrenOf = (store: StreamSpecStore) =>
	((store.current as { ui?: { children?: unknown[] } } | null)?.ui?.children ?? []) as Record<string, unknown>[];

describe('a child whose type has not arrived yet', () => {
	// Every node in a recorded stream opens like this: `{` then `"type"` then the
	// value. partial-json returns `{}` for each prefix below, and json-parse cuts a
	// half-written type back to `{}` too.
	const OPENING = '{"version":"1.0","ui":{"type":"flex","props":{"direction":"column"},"children":[{"type":"text","props":{"text":"before"}},';
	const STEPS = ['{', '"ty', 'pe"', ':', '"met'];

	it('never paints the unknown-widget box while the stream is open', async () => {
		const { store, push, container } = mount();
		await feed(store, push, OPENING, () => expect(container.textContent).toContain('before'));

		for (const step of STEPS) {
			const prev = store.current;
			const before = JSON.stringify(prev);
			push.enqueue(step);
			// Each parse is a new object, so a new identity means this step landed.
			await vi.waitFor(() => expect(store.current).not.toBe(prev));
			await tick();
			expect(childrenOf(store)).toHaveLength(2);
			expect(store.done, `after ${JSON.stringify(step)}`).toBe(false);
			expect(childrenOf(store)[1], `frame after ${JSON.stringify(step)} (${before})`).not.toHaveProperty('type');
			expect(container.querySelector('[data-ripple-unknown-widget]'), `after ${JSON.stringify(step)}`).toBeNull();
			expect(container.querySelector('[role="alert"]'), `after ${JSON.stringify(step)}`).toBeNull();
			expect(container.textContent).not.toContain("isn't in the catalog");
		}

		push.enqueue('ric","props":{"label":"Total","value":"42"}}]}}');
		push.close();
		await vi.waitFor(() => expect(store.done).toBe(true));
		await vi.waitFor(() => expect(container.textContent).toContain('42'));
		expect(container.querySelector('[data-ripple-unknown-widget]')).toBeNull();
	});

	it('never paints the unknown-widget box for the root while its type is arriving', async () => {
		const { store, push, container } = mount();
		push.enqueue('{"version":"1.0","ui":{"ty');
		await vi.waitFor(() => expect((store.current as { ui?: unknown } | null)?.ui).toEqual({}));
		await tick();
		expect(store.done).toBe(false);
		expect(container.querySelector('[data-ripple-unknown-widget]')).toBeNull();
		push.close();
	});

	it('control: a finished spec with a type the catalog lacks still shows the box', async () => {
		const { store, push, container } = mount();
		push.enqueue('{"version":"1.0","ui":{"type":"no-such-widget","id":"x"}}');
		push.close();
		await vi.waitFor(() => expect(store.done).toBe(true));
		await vi.waitFor(() => expect(container.querySelector('[data-ripple-unknown-widget="no-such-widget"]')).not.toBeNull());
	});
});

describe('a string prop that ends inside an expression', () => {
	// The model writes ui before state (the envelope asks for that), so state is
	// already known here only to make the finished number checkable.
	const HEAD = '{"version":"1.0","state":{"bill":100,"tipPercent":10,"cards":[1,2,3],"unit":"g"},"ui":{"type":"flex","props":{"direction":"column"},"children":[';

	// Each case is a prefix seen on the site, then the rest of the node.
	const CASES = [
		{ widget: 'metric', prop: 'value', open: '{state.bill * (1 + state.ti', rest: 'pPercent / 100)}', shows: '110' },
		{ widget: 'metric', prop: 'value', open: '{', rest: 'state.bill}', shows: '100' },
		{ widget: 'text', prop: 'text', open: 'Card 1 of {state.cards', rest: '.length}', shows: 'Card 1 of 3' },
		{ widget: 'text', prop: 'text', open: '{state.bill} {state.un', rest: 'it}', shows: '100 g' }
	];

	for (const c of CASES) {
		it(`${c.widget}.${c.prop} never shows the source of ${JSON.stringify(c.open)}`, async () => {
			const { store, push, container } = mount();
			const props = c.widget === 'metric' ? `{"label":"Total","${c.prop}":"` : `{"${c.prop}":"`;
			// Settles once the prop exists; the parser may hold back the open expression.
			await feed(store, push, `${HEAD}{"type":"text","props":{"text":"before"}},{"type":"${c.widget}","props":${props}${c.open}`, () =>
				expect((childrenOf(store)[1]?.props as Record<string, unknown> | undefined)?.[c.prop]).toBeTypeOf('string')
			);
			await vi.waitFor(() => expect(container.textContent).toContain('before'));

			const shown = container.textContent ?? '';
			expect(shown, 'raw expression source on screen mid-stream').not.toContain('{');
			expect(shown, 'raw expression source on screen mid-stream').not.toContain('state.');

			push.enqueue(`${c.rest}"}}]}}`);
			push.close();
			await vi.waitFor(() => expect(store.done).toBe(true));
			await vi.waitFor(() => expect(container.textContent).toContain(c.shows));
			expect(container.textContent).not.toContain('state.');
		});
	}

	it('control: a finished string with a closed expression renders the value', async () => {
		const { store, push, container } = mount();
		push.enqueue(`${HEAD}{"type":"metric","props":{"label":"Total","value":"{state.bill * (1 + state.tipPercent / 100)}"}}]}}`);
		push.close();
		await vi.waitFor(() => expect(store.done).toBe(true));
		await vi.waitFor(() => expect(container.textContent).toContain('110'));
	});
});
