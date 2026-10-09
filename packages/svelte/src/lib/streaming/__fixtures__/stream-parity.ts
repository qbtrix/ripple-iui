// @file streaming/__fixtures__/stream-parity.ts
// @description Test-only: the streamed test every data widget ships (design
//   doc 2026-10-09 §2.9). expectStreamParity(spec) mounts the spec through
//   mountStreamed() in small chunks, fails on any error box seen mid-stream,
//   then mounts the whole spec and requires the two final renders to match.
//   A mismatch means the widget captured a half-streamed value at mount (an
//   untrack seed, a non-derived read) and never caught up.
//   domShape() is the comparison: markup with Svelte's anchor comments,
//   generated ids, the illustration widget's per-instance id prefix and the
//   root's streaming marker removed, so two mounts of the same spec compare equal.
//   Write the fixture with id-less and field-less items; that is the point.
//   Lives under __fixtures__ so package.json keeps it out of the published files.
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { expect } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { mountStreamed } from './mount-streamed.js';

// Generated ids differ per mount; data-ripple-streaming marks only the streamed root.
// A radio group's name is a $props.id() too (c1, s2, ...), never a bind path.
const IGNORED = /\s(id|for|aria-controls|aria-labelledby|aria-describedby|aria-owns|data-ripple-streaming)="[^"]*"|\sname="[cs]\d+"/g;

export function domShape(root: Element): string {
	return root.innerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(IGNORED, '').replace(/\bill-c\d+-/g, 'ill-');
}

export async function expectStreamParity(spec: object, opts: { chunkSize?: number } = {}) {
	const streamed = await mountStreamed(spec, opts);
	expect(streamed.errors).toEqual([]);
	const whole = render(Ripple, { props: { spec } });
	await tick();
	expect(domShape(streamed.container)).toBe(domShape(whole.container));
	return { streamed: streamed.container, whole: whole.container };
}
