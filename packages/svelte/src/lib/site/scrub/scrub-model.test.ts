// lib/site/scrub/scrub-model.test.ts — Position to prefix to parsed spec, over real recordings.

import { describe, expect, test } from 'vitest';
import { createScrubModel } from './scrub-model.js';
import billSplitter from '../../../routes/live/fixtures/bill-splitter.json';
import savings from '../../../routes/live/fixtures/savings-calculator.json';

const full = (r: { chunks: { text: string }[] }) => r.chunks.map((c) => c.text).join('');

describe('createScrubModel', () => {
	const m = createScrubModel(billSplitter);

	test('position 0 is empty: no text, no spec, no bytes', () => {
		expect(m.countAt(0)).toBe(0);
		expect(m.countAt(-5)).toBe(0);
		expect(m.text(0)).toBe('');
		expect(m.bytes(0)).toBe(0);
		expect(m.spec(0)).toBeNull();
	});

	test('the end is the full spec', () => {
		expect(m.countAt(m.duration)).toBe(m.total);
		expect(m.countAt(m.duration + 10_000)).toBe(m.total);
		expect(m.text(m.total)).toBe(full(billSplitter));
		expect(m.spec(m.total)).toEqual(JSON.parse(full(billSplitter)));
		expect(m.totalBytes).toBe(new TextEncoder().encode(full(billSplitter)).length);
	});

	test('prefixes are monotonic: every count extends the one before', () => {
		let prev = '';
		for (let n = 0; n <= m.total; n++) {
			const now = m.text(n);
			expect(now.startsWith(prev)).toBe(true);
			expect(m.timeAt(n)).toBeGreaterThanOrEqual(m.timeAt(Math.max(0, n - 1)));
			prev = now;
		}
	});

	test('a seek between two chunk times lands on the earlier chunk', () => {
		const i = billSplitter.chunks.findIndex((c, k) => k > 0 && c.t - billSplitter.chunks[k - 1].t > 10);
		const before = billSplitter.chunks[i - 1].t;
		const mid = (before + billSplitter.chunks[i].t) / 2;
		expect(m.countAt(mid)).toBe(i);
		expect(m.text(m.countAt(mid))).toBe(billSplitter.chunks.slice(0, i).map((c) => c.text).join(''));
	});

	test('chunks that share a timestamp all arrive together', () => {
		const t = billSplitter.chunks.find((c, k) => billSplitter.chunks[k + 1]?.t === c.t)!.t;
		const last = billSplitter.chunks.findLastIndex((c) => c.t === t);
		expect(m.countAt(t)).toBe(last + 1);
		expect(m.timeAt(m.countAt(t))).toBe(t);
	});

	test('a parsed prefix is cached: scrubbing back returns the same object', () => {
		const s = createScrubModel(savings);
		const mid = s.countAt(s.duration / 2);
		const a = s.spec(mid);
		s.spec(s.total);
		s.spec(0);
		expect(a).not.toBeNull();
		expect(s.spec(mid)).toBe(a);
	});

	test('out-of-range counts clamp', () => {
		expect(m.text(m.total + 5)).toBe(m.text(m.total));
		expect(m.timeAt(-1)).toBe(0);
	});
});

describe('stepping', () => {
	const m = createScrubModel(billSplitter);

	test('stepping forward from 0 to the end and back visits the same counts, each reachable by its ms', () => {
		const fwd = [0];
		while (fwd[fwd.length - 1] < m.total) fwd.push(m.step(fwd[fwd.length - 1], 1));
		const back = [m.total];
		while (back[back.length - 1] > 0) back.push(m.step(back[back.length - 1], -1));
		expect(back.reverse()).toEqual(fwd);
		for (const c of fwd) expect(m.countAt(m.msFor(c))).toBe(c);
		// The first chunk lands at t = 0 and still has its own step.
		expect(fwd[1]).toBeGreaterThan(0);
	});

	test('steps clamp at both ends', () => {
		expect(m.step(0, -1)).toBe(0);
		expect(m.step(m.total, 1)).toBe(m.total);
	});
});
