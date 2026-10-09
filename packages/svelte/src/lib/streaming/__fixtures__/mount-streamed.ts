// @file streaming/__fixtures__/mount-streamed.ts
// @description Test-only helper: mount a spec the way a model delivers it,
//   through streamSpec() in small chunks, and record every node error box that
//   appears on the way. NodeRenderer's per-node <svelte:boundary> turns a widget
//   throw into an error box, and a later chunk can clear it, so asserting on the
//   finished render alone misses a mid-stream crash. `errors` holds the text of
//   each box seen at any point, deduplicated. The box is matched by its role and
//   title: its `data-ripple-node-error` attribute carries the node id, and Svelte
//   drops the attribute for a node without one.
//   Lives under __fixtures__ so package.json keeps it out of the published files.
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { expect, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { streamSpec } from '$lib/streaming/index.js';

/** Yields `json` in `size`-char chunks with a macrotask between each, so every
 *  partial spec renders: half-written ids, truncated strings, empty objects. */
export async function* chunked(json: string, size = 8) {
	for (let i = 0; i < json.length; i += size) {
		yield json.slice(i, i + size);
		await new Promise((r) => setTimeout(r, 0));
	}
}

export async function mountStreamed(
	spec: object,
	{ chunkSize = 8, props = {} }: { chunkSize?: number; props?: Record<string, unknown> } = {}
) {
	const store = streamSpec(chunked(JSON.stringify(spec), chunkSize), { throttleMs: 0 });
	const result = render(Ripple, { props: { streaming: store, ...props } });
	const seen = new Set<string>();
	const scan = () => {
		for (const el of result.container.querySelectorAll('[role="alert"]')) {
			const text = el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
			if (text.includes('This widget hit an error')) seen.add(text);
		}
	};
	const observer = new MutationObserver(scan);
	observer.observe(result.container, { subtree: true, childList: true });
	await vi.waitFor(() => expect(store.done).toBe(true), { timeout: 10_000 });
	await tick();
	scan();
	observer.disconnect();
	expect(store.error).toBeNull();
	return { ...result, store, errors: [...seen] };
}
