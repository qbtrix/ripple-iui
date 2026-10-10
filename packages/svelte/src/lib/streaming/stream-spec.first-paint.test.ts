// stream-spec.first-paint.test.ts — a streamed spec paints as soon as `ui`
// arrives, before `state`. The envelope teaches models to emit `ui` first so
// the first frame does not wait out the state block; this guards the renderer
// half of that contract: a node reading `{state.x}` mounts with the state still
// missing (no throw, no error box) and picks the value up when state lands.

import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { streamSpec } from '$lib/streaming/index.js';

function openStream(): { stream: ReadableStream<string>; push: ReadableStreamDefaultController<string> } {
	let push!: ReadableStreamDefaultController<string>;
	const stream = new ReadableStream<string>({ start: (c) => void (push = c) });
	return { stream, push };
}

describe('streamed first paint', () => {
	it('renders the ui tree before state arrives, then fills in state', async () => {
		const { stream, push } = openStream();
		const store = streamSpec(stream, { throttleMs: 0 });
		const { container } = render(Ripple, { props: { streaming: store } });

		push.enqueue('{"version":"1.0","ui":{"type":"text","props":{"text":"hello {state.x}"}}');
		await vi.waitFor(() => expect(container.textContent).toContain('hello'));

		expect(store.done).toBe(false);
		expect((store.current as { state?: unknown }).state).toBeUndefined();
		expect(store.error).toBeNull();
		expect(container.querySelector('[data-ripple-node-error]')).toBeNull();
		expect(container.querySelector('[role="alert"]')).toBeNull();

		push.enqueue(',"state":{"x":"hi"}}');
		push.close();
		await vi.waitFor(() => expect(store.done).toBe(true));
		await vi.waitFor(() => expect(container.textContent).toContain('hello hi'));
		expect(store.error).toBeNull();
	});
});
