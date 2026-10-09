// widgets/data-kit/format.test.ts — the data-hygiene helpers against the
// values models actually write: NaN, numeric strings, junk currency codes,
// markdown habits, relative and impossible dates.
import { describe, expect, it } from 'vitest';
import { dateKey, dateLabel, finite, money, num, plain, sum } from './format.js';
import { pairSpans } from './pair.js';

describe('money', () => {
	it('formats with Intl and the ISO code', () => {
		expect(money(12.5, 'USD', { locale: 'en-US' })).toBe('$12.50');
		expect(money(1299, 'eur', { locale: 'en-US' })).toBe('€1,299.00');
		expect(money('8', 'USD', { locale: 'en-US', sign: true })).toBe('+$8.00');
		expect(money(-700, 'USD', { locale: 'en-US', sign: true })).toBe('-$700.00');
		expect(money(0, 'USD', { locale: 'en-US', sign: true })).toBe('$0.00');
	});

	it('defaults to USD and never throws on a junk code or locale', () => {
		expect(money(5, undefined, { locale: 'en-US' })).toBe('$5.00');
		expect(money(5, '$', { locale: 'en-US' })).toBe('$5.00');
		expect(money(5, 'dollars', { locale: 'en-US' })).toBe('$5.00');
		expect(() => money(5, 'USD', { locale: 'not a locale!!' })).not.toThrow();
	});

	it('renders non-finite values as n/a', () => {
		for (const v of [NaN, Infinity, undefined, null, '', 'abc', {}]) expect(money(v)).toBe('n/a');
	});
});

describe('num, finite, sum', () => {
	it('formats finite numbers and numeric strings, n/a otherwise', () => {
		expect(num(1234.567, { locale: 'en-US' })).toBe('1,234.57');
		expect(num('42', { locale: 'en-US' })).toBe('42');
		expect(num(NaN)).toBe('n/a');
		expect(num(undefined)).toBe('n/a');
		expect(finite('  ')).toBeUndefined();
	});

	it('drops non-finite values out of a sum', () => {
		expect(sum([1, '2', NaN, undefined, 'x', Infinity, 3.5])).toBe(6.5);
		expect(sum('not an array')).toBe(0);
	});
});

describe('plain', () => {
	it('strips paired bold markers and leading list dashes', () => {
		expect(plain('HbA1c **7.9%** is high')).toBe('HbA1c 7.9% is high');
		expect(plain('__Note__: fasting')).toBe('Note: fasting');
		expect(plain('- one\n- two')).toBe('one\ntwo');
		expect(plain('**a** and **b**')).toBe('a and b');
	});

	it('leaves single markers and in-word dashes alone', () => {
		expect(plain('2*3 = 6')).toBe('2*3 = 6');
		expect(plain('2**10')).toBe('2**10');
		expect(plain('well-known - not a bullet')).toBe('well-known - not a bullet');
	});

	it('coerces non-strings without throwing', () => {
		expect(plain(undefined)).toBe('');
		expect(plain(null)).toBe('');
		expect(plain(42)).toBe('42');
	});
});

describe('dates', () => {
	it('shows a written label as written', () => {
		expect(dateLabel('next Tuesday')).toBe('next Tuesday');
		expect(dateLabel('Fri 16 Oct')).toBe('Fri 16 Oct');
	});

	it('is empty for missing input and never says Invalid Date', () => {
		for (const v of [undefined, null, '', NaN, {}, '2026-02-31', '2026-13-01', 'garbage']) {
			expect(dateLabel(v)).not.toMatch(/invalid/i);
		}
		expect(dateLabel(undefined)).toBe('');
		expect(dateLabel(null)).toBe('');
	});

	it('formats a valid ISO day from its own digits, whatever the time zone', () => {
		expect(dateLabel('2026-10-16', 'en-US')).toBe('Fri, Oct 16');
		// Late evening east of UTC is still the 16th: the day is never shifted.
		expect(dateLabel('2026-10-16T23:30:00+09:00', 'en-US')).toBe('Fri, Oct 16');
		// An impossible day stays as written instead of rolling into March.
		expect(dateLabel('2026-02-31')).toBe('2026-02-31');
	});

	it('gives a sort key for ISO strings only', () => {
		expect(dateKey('2026-10-16')).toBe(Date.UTC(2026, 9, 16));
		expect(dateKey('next Tuesday')).toBeUndefined();
		expect(dateKey('Fri 16 Oct')).toBeUndefined();
		expect(dateKey(undefined)).toBeUndefined();
		expect(dateKey('2026-13-01')).toBeUndefined();
	});
});

describe('pairSpans', () => {
	const half = (s: string) => s.startsWith('h');

	it('pairs two consecutive half-eligible sections and spans the rest', () => {
		expect(pairSpans(['h1', 'h2'], half)).toEqual(['half', 'half']);
		expect(pairSpans(['h1', 'table', 'h2'], half)).toEqual(['full', 'full', 'full']);
		expect(pairSpans(['h1', 'h2', 'h3'], half)).toEqual(['half', 'half', 'full']);
		expect(pairSpans(['table', 'h1', 'h2', 'h3', 'h4'], half)).toEqual(['full', 'half', 'half', 'half', 'half']);
		expect(pairSpans([], half)).toEqual([]);
	});
});
