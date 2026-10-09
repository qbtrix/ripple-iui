// widgets/display/illustration-contrast.test.ts: the illustration's colour
// maths: parsing (hex, rgb(), named, currentColor, oklch, refusals), WCAG
// contrast on known pairs, compositing, and the readable pick.
import { describe, expect, it } from 'vitest';
import { contrast, luminance, over, parseColor, pickReadable, toCss, type Rgba } from './illustration-contrast.js';

const BLACK: Rgba = [0, 0, 0, 1];
const WHITE: Rgba = [1, 1, 1, 1];

describe('parseColor', () => {
	it('reads hex in every length', () => {
		expect(parseColor('#fff')).toEqual(WHITE);
		expect(parseColor('#000000')).toEqual(BLACK);
		expect(parseColor('#ff000080')).toEqual([1, 0, 0, 128 / 255]);
		expect(parseColor('#f008')![3]).toBeCloseTo(0x88 / 255);
	});

	it('reads rgb()/rgba() with commas, spaces and percentages', () => {
		expect(parseColor('rgb(255, 0, 0)')).toEqual([1, 0, 0, 1]);
		expect(parseColor('rgba(0, 0, 0, 0)')).toEqual([0, 0, 0, 0]);
		expect(parseColor('rgb(0 0 255 / 50%)')).toEqual([0, 0, 1, 0.5]);
		expect(parseColor('rgb(100%, 100%, 100%)')).toEqual(WHITE);
	});

	it('reads named colours, currentColor and computed-style forms', () => {
		expect(parseColor('White')).toEqual(WHITE);
		expect(parseColor('navy')).toEqual([0, 0, 128 / 255, 1]);
		expect(parseColor('currentColor')).toBeNull();
		expect(parseColor('currentColor', WHITE)).toEqual(WHITE);
		const ok = parseColor('oklch(1 0 0)')!;
		ok.forEach((v) => expect(v).toBeCloseTo(1, 3));
		expect(parseColor('color(srgb 1 1 1 / 0.06)')).toEqual([1, 1, 1, 0.06]);
	});

	it('refuses what it cannot read', () => {
		for (const s of ['url(#g)', 'none', '', 'hsl(0 0% 0%)', '#12', 'rgb(1,2)', 'nonsense', null, undefined]) {
			expect(parseColor(s)).toBeNull();
		}
	});
});

describe('contrast', () => {
	it('matches known WCAG pairs', () => {
		expect(contrast(BLACK, WHITE)).toBeCloseTo(21, 5);
		expect(contrast(WHITE, BLACK)).toBeCloseTo(21, 5);
		expect(contrast(WHITE, WHITE)).toBe(1);
		expect(contrast(parseColor('#777')!, WHITE)).toBeCloseTo(4.48, 2);
		expect(luminance(WHITE)).toBeCloseTo(1, 6);
	});

	it('composites a translucent fill over the background first', () => {
		expect(contrast([0, 0, 0, 0], WHITE)).toBe(1);
		expect(over([0, 0, 0, 0.5], WHITE)).toEqual([0.5, 0.5, 0.5, 1]);
	});

	it('picks the candidate that reads better', () => {
		const navy = parseColor('#1e3a8a')!;
		expect(pickReadable(BLACK, navy, WHITE)).toBe(WHITE);
		expect(pickReadable(WHITE, navy, WHITE)).toBe(navy);
	});

	it('writes rgb() back for an attribute', () => {
		expect(toCss([1, 0.5, 0, 1])).toBe('rgb(255, 128, 0)');
		expect(toCss([0, 0, 0, 0.25])).toBe('rgba(0, 0, 0, 0.25)');
	});
});
