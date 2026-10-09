// security/illustration-annotations.test.ts — checkIllustrationAnnotations, the
// policy check for the illustration `annotations` prop: a good set passes,
// absent passes, and each malformed shape is refused with a reason.
import { describe, expect, it } from 'vitest';
import { ILLUSTRATION_ANNOTATION_CAPS as CAPS } from '@ripple-ui/core/manifest';
import { checkIllustrationAnnotations } from './illustration-svg.js';

// `dropped` sits on an element the rebuild drops (filter is not allowlisted).
const svg = `<svg viewBox='0 0 100 100'><rect id='box' width='10' height='10'/><filter id='dropped'/></svg>`;
const ok = { id: 'a', label: 'Box', note: 'A box.', target: 'box' };
const check = (annotations: unknown, markup = svg) => checkIllustrationAnnotations({ svg: markup, annotations });

describe('checkIllustrationAnnotations', () => {
	it('passes a good set, an at point, and no annotations', () => {
		expect(check([ok, { id: 'b', label: 'Corner', note: '', at: [0, 100] }])).toEqual({ ok: true });
		expect(check(undefined)).toEqual({ ok: true });
		expect(check([])).toEqual({ ok: true });
	});

	const refusals: Array<[string, unknown, RegExp]> = [
		['not a list', { a: ok }, /not a list/],
		['more than 8', Array.from({ length: CAPS.max + 1 }, (_, i) => ({ ...ok, id: `n${i}` })), /more than 8/],
		['an entry that is not an object', ['x'], /not an object/],
		['no id', [{ ...ok, id: '' }], /no id/],
		['a duplicate id', [ok, ok], /duplicate id/],
		['no label', [{ ...ok, label: ' ' }], /no label/],
		['an overlong label', [{ ...ok, label: 'x'.repeat(CAPS.label + 1) }], /label over 40/],
		['no note', [{ id: 'a', label: 'Box', target: 'box' }], /no note/],
		['an overlong note', [{ ...ok, note: 'x'.repeat(CAPS.note + 1) }], /note over 280/],
		['both target and at', [{ ...ok, at: [1, 2] }], /exactly one of target or at/],
		['neither target nor at', [{ id: 'a', label: 'Box', note: '' }], /exactly one of target or at/],
		['a non-finite at', [{ id: 'a', label: 'Box', note: '', at: [1, Infinity] }], /two finite numbers/],
		['a NaN at', [{ id: 'a', label: 'Box', note: '', at: [Number.NaN, 1] }], /two finite numbers/],
		['an at with three numbers', [{ id: 'a', label: 'Box', note: '', at: [1, 2, 3] }], /two finite numbers/],
		['a string at', [{ id: 'a', label: 'Box', note: '', at: ['1', '2'] }], /two finite numbers/],
		['a target id not in the svg', [{ ...ok, target: 'nope' }], /not an id in the svg/],
		['a target on an element the rebuild drops', [{ ...ok, target: 'dropped' }], /not an id in the svg/],
		['an empty target', [{ ...ok, target: '' }], /target is not an id/]
	];
	it.each(refusals)('refuses %s', (_name, annotations, reason) => {
		const r = check(annotations);
		expect(r.ok).toBe(false);
		expect(!r.ok && r.reason).toMatch(reason);
	});

	it('refuses a target when the svg does not rebuild', () => {
		expect(check([ok], `<svg viewBox='0 0 1 1'><rect id='box'`).ok).toBe(false);
	});
});
