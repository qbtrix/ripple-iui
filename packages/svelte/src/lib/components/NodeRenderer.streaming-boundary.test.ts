// NodeRenderer.streaming-boundary.test.ts — a widget that throws on half-streamed
// props must recover once the props complete, and must not show the red error
// box while the stream is still open. A widget that still throws after the
// stream ends must show it. Drives a real streamSpec() store through Ripple with
// a hand-fed ReadableStream so each test controls exactly where the stream pauses.

import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { streamSpec } from '$lib/streaming/index.js';
import type { StreamSpecStore } from '$lib/streaming/index.js';
import { registerWidget, unregisterWidget } from '$lib/widgets/index.js';
import NeedsThreeItemsWidget from './__fixtures__/NeedsThreeItemsWidget.svelte';

/** A ReadableStream the test feeds by hand and can leave open (a model that pauses). */
function openStream(): { stream: ReadableStream<string>; push: ReadableStreamDefaultController<string> } {
	let push!: ReadableStreamDefaultController<string>;
	const stream = new ReadableStream<string>({ start: (c) => void (push = c) });
	return { stream, push };
}

// Ends inside the `items` array: the node's type and id are complete, its
// props are not, so the widget mounts with one item and throws.
const HEAD =
	'{"version":"1.0","ui":{"type":"flex","props":{"direction":"column"},"children":[' +
	'{"type":"text","props":{"text":"before"}},' +
	'{"type":"needs3","id":"list","props":{"items":["a"';

const ERROR_TITLE = 'This widget hit an error';

function streamedItems(store: StreamSpecStore): unknown {
	const ui = (store.current as { ui?: { children?: { props?: { items?: unknown } }[] } } | null)?.ui;
	return ui?.children?.[1]?.props?.items;
}

let controller: ReadableStreamDefaultController<string> | null = null;

async function mountHead() {
	const { stream, push } = openStream();
	controller = push;
	const store = streamSpec(stream, { throttleMs: 0 });
	const view = render(Ripple, { props: { streaming: store } });
	push.enqueue(HEAD);
	// The parser delivered the half-streamed node to a live renderer.
	await vi.waitFor(() => {
		expect(streamedItems(store)).toEqual(['a']);
		expect(view.container.textContent).toContain('before');
	});
	await tick();
	return { store, push, container: view.container };
}

describe('per-node boundary under streaming', () => {
	afterEach(() => {
		try {
			controller?.close();
		} catch {
			// already closed
		}
		controller = null;
		unregisterWidget('needs3');
		vi.restoreAllMocks();
	});

	function setup() {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		registerWidget('needs3', NeedsThreeItemsWidget);
	}

	it('control: the fixture renders without error when mounted whole with three items', () => {
		setup();
		const { container } = render(Ripple, {
			props: { spec: { ui: { type: 'needs3', id: 'list', props: { items: ['a', 'b', 'c'] } } } }
		});
		expect(container.querySelector('[data-ripple-node-error]')).toBeNull();
		expect(container.querySelector('[data-testid="three-items"]')?.textContent).toBe('abc');
	});

	it('does not show the red error box while the stream is still open', async () => {
		setup();
		const { store, container } = await mountHead();

		expect(store.done).toBe(false);
		expect(streamedItems(store)).toHaveLength(1);
		expect(container.querySelector('[data-ripple-node-error]')).toBeNull();
		expect(container.textContent).not.toContain(ERROR_TITLE);
	});

	it('renders the widget once its props complete, before and after the stream ends', async () => {
		setup();
		const { store, push, container } = await mountHead();

		// Props complete, stream left open.
		push.enqueue(',"b","c"]}}]}}');
		await vi.waitFor(() => expect(streamedItems(store)).toEqual(['a', 'b', 'c']));
		expect(store.done).toBe(false);
		await vi.waitFor(() => {
			expect(container.querySelector('[data-ripple-node-error]')).toBeNull();
			expect(container.querySelector('[data-testid="three-items"]')?.textContent).toBe('abc');
		}, { timeout: 1000 });

		push.close();
		await vi.waitFor(() => expect(store.done).toBe(true));
		await tick();
		expect(store.error).toBeNull();
		expect(container.querySelector('[data-ripple-node-error]')).toBeNull();
		expect(container.querySelector('[data-testid="three-items"]')?.textContent).toBe('abc');
	});

	it('still shows the error box for a widget that throws after the stream ends', async () => {
		setup();
		const { store, push, container } = await mountHead();

		push.enqueue(',"b"]}}]}}');
		push.close();
		await vi.waitFor(() => expect(store.done).toBe(true));
		expect(store.error).toBeNull();
		expect(streamedItems(store)).toEqual(['a', 'b']);

		await vi.waitFor(() => {
			const errorEl = container.querySelector('[data-ripple-node-error="list"]');
			expect(errorEl).not.toBeNull();
			expect(errorEl!.getAttribute('role')).toBe('alert');
		}, { timeout: 1000 });
		expect(container.textContent).toContain(ERROR_TITLE);
	});

	it('the error box after the stream ends reports the final props, not a half-streamed frame', async () => {
		setup();
		const { store, push, container } = await mountHead();

		push.enqueue(',"b"]}}]}}');
		push.close();
		await vi.waitFor(() => expect(store.done).toBe(true));
		await vi.waitFor(() => {
			expect(container.querySelector('[data-ripple-node-error="list"]')).not.toBeNull();
			expect(container.textContent).toContain('needs three items, got 2');
		}, { timeout: 1000 });
	});
});
