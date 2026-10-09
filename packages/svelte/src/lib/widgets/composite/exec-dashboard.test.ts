// widgets/composite/exec-dashboard.test.ts — the rows-mode aggregation of
// exec-dashboard: sums, counts and averages that skip junk, filters that
// recompute every number, trends against compare rows or the previous bucket,
// buckets and colour slots fixed by the unfiltered rows, breakdown with an
// Other fold, column totals, formatting and axis ticks.
import { describe, expect, it } from 'vitest';
import {
	aggregate,
	breakdown,
	bucketer,
	defaultColumns,
	filterRows,
	fmt,
	kpis,
	readDimensions,
	readFilters,
	readMeasures,
	readRows,
	series,
	splitKeys,
	ticks,
	totals,
	trend,
	type Measure
} from './exec-dashboard.js';

const revenue: Measure = { key: 'amount', label: 'Revenue', format: 'money', agg: 'sum', good: 'up' };
const orders: Measure = { label: 'Orders', format: 'number', agg: 'count', good: 'up' };
const avgOrder: Measure = { key: 'amount', label: 'Avg order', format: 'money', agg: 'avg', good: 'up' };

const rows = [
	{ id: 'o1', date: '2026-07-03', region: 'North', channel: 'Web', amount: 100 },
	{ id: 'o2', date: '2026-07-19', region: 'South', channel: 'Social', amount: 50 },
	{ id: 'o3', date: '2026-08-02', region: 'North', channel: 'Web', amount: 200 },
	{ id: 'o4', date: '2026-08-21', region: 'West', channel: 'Marketplace', amount: 'NaN' },
	{ id: 'o5', date: '2026-09-09', region: 'North', channel: 'Social', amount: 300 },
	{ id: 'o6', date: '2026-09-28', region: 'South', channel: 'Web', amount: '150' }
];

describe('readers', () => {
	it('drops junk rows, measures, dimensions and filters', () => {
		expect(readRows('soon')).toEqual([]);
		expect(readRows([null, 3, 'x', [1], { a: 1 }])).toEqual([{ a: 1 }]);
		expect(readMeasures(5)).toEqual([{ label: 'Count', format: 'number', agg: 'count', good: 'up' }]);
		expect(readMeasures([null, { label: 'No key sum', agg: 'sum' }, { key: 'amount', label: 'Rev', format: 'money' }])).toEqual([
			{ key: 'amount', label: 'Rev', format: 'money', agg: 'sum', good: 'up' }
		]);
		expect(readMeasures([{ label: 'Orders' }])[0]).toMatchObject({ agg: 'count', format: 'number' });
		expect(readMeasures([{ key: 'refunds', label: 'Refunds', format: 'weird', good: 'down' }])[0]).toMatchObject({ format: 'number', good: 'down' });
		expect(readDimensions([{ key: 'region' }, { label: 'no key' }, 7])).toEqual([{ key: 'region', label: 'region' }]);
		expect(readFilters('x')).toEqual({});
		expect(readFilters({ region: 'West', channel: '', n: 3 })).toEqual({ region: 'West' });
	});
});

describe('aggregate', () => {
	it('sums finite values and numeric strings, skipping NaN', () => {
		expect(aggregate(rows, revenue)).toBe(800);
	});
	it('counts rows, including rows whose amount is junk', () => {
		expect(aggregate(rows, orders)).toBe(6);
	});
	it('averages only the finite values', () => {
		expect(aggregate(rows, avgOrder)).toBe(160);
		expect(aggregate([{ amount: 'x' }], avgOrder)).toBeUndefined();
		expect(aggregate([], revenue)).toBe(0);
	});
});

describe('filter', () => {
	it('recomputes every number from the filtered rows', () => {
		const north = filterRows(rows, { region: 'North' });
		expect(north.map((r) => r.id)).toEqual(['o1', 'o3', 'o5']);
		expect(aggregate(north, revenue)).toBe(600);
		expect(aggregate(north, orders)).toBe(3);
		expect(aggregate(north, avgOrder)).toBe(200);
		const b = bucketer(rows, 'date');
		expect(series(north, b, revenue).map((p) => p.total)).toEqual([100, 200, 300]);
		expect(breakdown(north, 'channel', revenue).map((s) => [s.label, s.value])).toEqual([
			['Web', 300],
			['Social', 300]
		]);
		expect(totals(north, [{ key: 'amount', label: 'Amount' }], [revenue])).toEqual({ amount: 600 });
	});
	it('combines filters and treats an unknown value as no rows', () => {
		expect(filterRows(rows, { region: 'North', channel: 'Web' }).map((r) => r.id)).toEqual(['o1', 'o3']);
		expect(filterRows(rows, { region: 'Mars' })).toEqual([]);
		expect(filterRows(rows, {})).toBe(rows);
	});
});

describe('buckets', () => {
	it('buckets ISO days by month past 31 days, keeping empty months when a filter empties one', () => {
		const b = bucketer(rows, 'date');
		expect(b.buckets.map((x) => x.key)).toEqual(['2026-07', '2026-08', '2026-09']);
		expect(b.buckets[0].label).toMatch(/Jul/);
		const west = filterRows(rows, { region: 'West' });
		expect(series(west, b, orders).map((p) => p.total)).toEqual([0, 1, 0]);
	});
	it('buckets by day for a short span, sorted by date', () => {
		const b = bucketer([{ d: '2026-07-03' }, { d: '2026-07-01' }, { d: '2026-07-03' }], 'd');
		expect(b.buckets.map((x) => x.key)).toEqual(['2026-07-01', '2026-07-03']);
	});
	it('groups labels as written in first-seen order, and never parses them', () => {
		const b = bucketer([{ m: 'Jul' }, { m: 'Aug' }, { m: 'Jul' }, { m: 'Sep' }, {}], 'm');
		expect(b.buckets.map((x) => x.label)).toEqual(['Jul', 'Aug', 'Sep']);
		expect(bucketer(rows, undefined).buckets).toEqual([]);
	});
});

describe('series and colour slots', () => {
	it('splits each bucket by series fixed from the unfiltered rows', () => {
		const keys = splitKeys(rows, 'channel');
		expect(keys).toEqual(['Web', 'Social', 'Marketplace']);
		const b = bucketer(rows, 'date');
		const north = series(filterRows(rows, { region: 'North' }), b, revenue, { key: 'channel', keys });
		expect(north[2].parts).toEqual({ Web: 0, Social: 300, Marketplace: 0 });
		// The keys (and so the colours) do not change when a filter removes a channel.
		expect(Object.keys(north[0].parts)).toEqual(keys);
	});
	it('folds the tail into Other past five values instead of cycling colours', () => {
		const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c) => ({ c }));
		expect(splitKeys(many, 'c')).toEqual(['A', 'B', 'C', 'D', 'Other']);
		const b = bucketer([{ x: 'one', c: 'A' }, { x: 'one', c: 'G' }, { x: 'one', c: 'F' }], 'x');
		const s = series([{ x: 'one', c: 'A' }, { x: 'one', c: 'G' }, { x: 'one', c: 'F' }], b, orders, { key: 'c', keys: splitKeys(many, 'c') });
		expect(s[0].parts.Other).toBe(2);
	});
});

describe('breakdown', () => {
	it('sorts largest first with shares, and folds past max into Other', () => {
		const s = breakdown(rows, 'region', revenue);
		expect(s.map((x) => [x.label, x.value])).toEqual([
			['North', 600],
			['South', 200],
			['West', 0]
		]);
		expect(s[0].share).toBeCloseTo(0.75);
		const folded = breakdown(rows, 'region', orders, 2);
		expect(folded.map((x) => [x.label, x.value])).toEqual([
			['North', 3],
			['Other', 3]
		]);
	});
});

describe('trend', () => {
	it('reports the change with direction and which way is good', () => {
		expect(trend(120, 100, 'up', 'vs Q2')).toEqual({ dir: 'up', text: '+20% vs Q2', good: 'up' });
		expect(trend(95, 100, 'down', '')).toEqual({ dir: 'down', text: '−5.0%', good: 'down' });
		expect(trend(100.2, 100, 'up', '')?.dir).toBe('flat');
		expect(trend(5, 0, 'up', '')).toBeUndefined();
		expect(trend(undefined, 5, 'up', '')).toBeUndefined();
	});
	it('KPIs trend against filtered compare rows when given', () => {
		const compare = [
			{ region: 'North', amount: 400 },
			{ region: 'South', amount: 1000 }
		];
		const north = filterRows(rows, { region: 'North' });
		const [rev, count] = kpis(north, [revenue, orders], { compare: filterRows(compare, { region: 'North' }), compareLabel: 'vs Q2' });
		expect(rev).toMatchObject({ value: 600, shown: '$600', trend: { dir: 'up', text: '+50% vs Q2' } });
		expect(count.trend).toMatchObject({ dir: 'up', text: '+200% vs Q2' });
	});
	it('KPIs fall back to the last bucket against the one before it', () => {
		const b = bucketer(rows, 'date');
		const [rev, , avg] = kpis(rows, [revenue, orders, avgOrder], { bucketer: b });
		// Sep 450 vs Aug 200 (the NaN order drops out of the sum).
		expect(rev.value).toBe(800);
		expect(rev.trend?.dir).toBe('up');
		expect(rev.trend?.text).toMatch(/^\+125% Sep vs Aug$/);
		// Avg: Sep 225 vs Aug 200.
		expect(avg.trend?.text).toMatch(/^\+13% Sep vs Aug$/);
	});
	it('gives no trend with one bucket and no compare rows', () => {
		const one = [{ m: 'Jul', amount: 5 }];
		expect(kpis(one, [revenue], { bucketer: bucketer(one, 'm') })[0].trend).toBeUndefined();
	});
});

describe('columns, totals and formatting', () => {
	it('builds default columns once each, measured columns right-aligned', () => {
		const cols = defaultColumns('date', [{ key: 'region', label: 'Region' }], 'channel', [revenue, orders, avgOrder]);
		expect(cols.map((c) => c.key)).toEqual(['date', 'region', 'channel', 'amount']);
		expect(cols[3]).toEqual({ key: 'amount', label: 'Revenue', align: 'right' });
	});
	it('totals only summed measure columns', () => {
		expect(totals(rows, [{ key: 'region', label: 'R' }, { key: 'amount', label: 'A' }], [avgOrder, revenue])).toEqual({ amount: 800 });
		expect(totals(rows, [{ key: 'amount', label: 'A' }], [avgOrder])).toEqual({});
	});
	it('formats money, numbers and percents without throwing', () => {
		expect(fmt(38214.5, 'money')).toBe('$38,215');
		expect(fmt(64.375, 'money')).toBe('$64.38');
		expect(fmt(12000, 'money', 'USD', true)).toBe('$12K');
		expect(fmt(1250, 'money', 'EUR')).toBe('€1,250');
		expect(fmt(5, 'money', '$$')).toBe('$5.00');
		expect(fmt(12.5, 'percent')).toBe('12.5%');
		expect(fmt(1234.567, 'number')).toBe('1,234.57');
		expect(fmt('NaN', 'number')).toBe('n/a');
	});
	it('makes clean ticks that cover the max', () => {
		expect(ticks(38)).toEqual([0, 10, 20, 30, 40]);
		expect(ticks(40)).toEqual([0, 10, 20, 30, 40]);
		expect(ticks(9200)).toEqual([0, 2500, 5000, 7500, 10000]);
		expect(ticks(0)).toEqual([0]);
		expect(ticks(NaN)).toEqual([0]);
	});
});
