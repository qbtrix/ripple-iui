// widgets/composite/exec-dashboard.ts — the rows mode of exec-dashboard as
// plain functions (design doc 2026-10-09 §3.10). The model writes raw rows
// (orders with date, region, amount) plus which measures and dimensions to
// show; everything a reader sees is computed here from the FILTERED rows, so a
// filter recomputes every number: KPIs, their trends, the chart series, the
// breakdown and the table totals.
//
// Every reader takes model output and never throws: a non-array is [], a row
// that is not an object is dropped, a non-finite number drops out of a sum or
// average instead of poisoning it.
//
// Invariants:
// - Buckets and colour slots come from the UNFILTERED rows, so filtering never
//   moves the x axis or repaints a series (colour follows the entity).
// - Dates are never parsed for display. ISO days bucket by their own digits;
//   anything else groups by the label as written, in first-seen order.
import { finite, plain } from '../data-kit/format.js';

export type Row = Record<string, unknown>;
export type Format = 'money' | 'number' | 'percent';
export type Agg = 'sum' | 'avg' | 'count';
export type Measure = { key?: string; label: string; format: Format; agg: Agg; good: 'up' | 'down' };
export type Dimension = { key: string; label: string };
export type Filters = Record<string, string>;
export type Bucket = { key: string; label: string };
export type Trend = { dir: 'up' | 'down' | 'flat'; text: string; good: 'up' | 'down' };
export type Column = { key: string; label: string; align?: 'left' | 'right' | 'center' };

const isObj = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? plain(String(v)) : '');

/** Plain-object rows only; anything else is dropped. */
export function readRows(v: unknown): Row[] {
	return Array.isArray(v) ? v.filter(isObj) : [];
}

const FORMATS: readonly Format[] = ['money', 'number', 'percent'];
const AGGS: readonly Agg[] = ['sum', 'avg', 'count'];

/** Measures as written; a measure with neither key nor count agg is dropped. */
export function readMeasures(v: unknown): Measure[] {
	const out: Measure[] = [];
	for (const m of Array.isArray(v) ? v : []) {
		if (!isObj(m)) continue;
		const key = typeof m.key === 'string' && m.key ? m.key : undefined;
		const agg = AGGS.includes(m.agg as Agg) ? (m.agg as Agg) : key ? 'sum' : 'count';
		if (!key && agg !== 'count') continue;
		out.push({
			key,
			label: text(m.label) || key || 'Count',
			format: FORMATS.includes(m.format as Format) ? (m.format as Format) : 'number',
			agg,
			good: m.good === 'down' ? 'down' : 'up'
		});
	}
	return out.length ? out : [{ label: 'Count', format: 'number', agg: 'count', good: 'up' }];
}

export function readDimensions(v: unknown): Dimension[] {
	const out: Dimension[] = [];
	for (const d of Array.isArray(v) ? v : []) {
		if (isObj(d) && typeof d.key === 'string' && d.key) out.push({ key: d.key, label: text(d.label) || d.key });
	}
	return out;
}

/** `{ region: 'West' }`; non-string values and empty strings mean "all". */
export function readFilters(v: unknown): Filters {
	const out: Filters = {};
	if (isObj(v)) for (const [k, val] of Object.entries(v)) if (typeof val === 'string' && val) out[k] = val;
	return out;
}

export function filterRows(rows: Row[], filters: Filters): Row[] {
	const pins = Object.entries(filters);
	if (!pins.length) return rows;
	return rows.filter((r) => pins.every(([k, v]) => text(r[k]) === v));
}

/** sum and avg skip non-finite values; avg of nothing is undefined; count counts rows. */
export function aggregate(rows: Row[], m: Measure): number | undefined {
	if (m.agg === 'count') return rows.length;
	let total = 0;
	let n = 0;
	for (const r of rows) {
		const x = finite(r[m.key ?? '']);
		if (x === undefined) continue;
		total += x;
		n++;
	}
	if (m.agg === 'avg') return n ? total / n : undefined;
	return total;
}

/** Distinct values of a column in first-seen order. */
export function distinct(rows: Row[], key: string): string[] {
	const seen = new Set<string>();
	for (const r of rows) {
		const v = text(r[key]);
		if (v) seen.add(v);
	}
	return [...seen];
}

/** At most 5 categorical slots (--chart-1..5). Past 5 values the tail folds into "Other". */
export const MAX_SLOTS = 5;
export const OTHER = 'Other';

/** Series keys for a split column, fixed from the unfiltered rows. */
export function splitKeys(allRows: Row[], key: string | undefined): string[] {
	if (!key) return [];
	const values = distinct(allRows, key);
	return values.length <= MAX_SLOTS ? values : [...values.slice(0, MAX_SLOTS - 1), OTHER];
}

/** The series a row belongs to, given the fixed keys. */
export function seriesOf(row: Row, key: string, keys: string[]): string | undefined {
	const v = text(row[key]);
	if (!v) return undefined;
	return keys.includes(v) ? v : keys.includes(OTHER) ? OTHER : undefined;
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;
const DAY_MS = 86_400_000;

function isoDay(v: unknown): string | undefined {
	if (typeof v !== 'string') return undefined;
	const m = ISO_DAY.exec(v.trim());
	if (!m) return undefined;
	const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
	return new Date(t).toISOString().slice(0, 10) === m[0] ? m[0] : undefined;
}

function utcLabel(iso: string, opts: Intl.DateTimeFormatOptions): string {
	const [y, mo, d] = iso.split('-').map(Number);
	return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: 'UTC' }).format(Date.UTC(y, mo - 1, d || 1));
}

/** `unit` names the bucket for a chart title: 'day', 'month', or the x column's own name. */
export type Bucketer = { buckets: Bucket[]; keyOf: (row: Row) => string | undefined; unit: string };

/**
 * The x axis. When every x value is an ISO day, rows bucket by day for a span
 * of 31 days or less and by month beyond that, sorted by date. Otherwise rows
 * group by the label as written, in first-seen order.
 */
export function bucketer(allRows: Row[], x: string | undefined): Bucketer {
	if (!x) return { buckets: [], keyOf: () => undefined, unit: '' };
	const values = allRows.map((r) => r[x]).filter((v) => text(v));
	const days = values.map(isoDay);
	if (values.length && days.every(Boolean)) {
		const sorted = [...new Set(days as string[])].sort();
		const span = (Date.parse(sorted.at(-1)!) - Date.parse(sorted[0])) / DAY_MS;
		const byDay = span <= 31;
		const multiYear = sorted[0].slice(0, 4) !== sorted.at(-1)!.slice(0, 4);
		const keyOf = (row: Row) => {
			const d = isoDay(row[x]);
			return d && (byDay ? d : d.slice(0, 7));
		};
		const keys = [...new Set(sorted.map((d) => (byDay ? d : d.slice(0, 7))))];
		const buckets = keys.map((k) => ({
			key: k,
			label: byDay
				? utcLabel(k, { month: 'short', day: 'numeric' })
				: utcLabel(k, multiYear ? { month: 'short', year: 'numeric' } : { month: 'short' })
		}));
		return { buckets, keyOf, unit: byDay ? 'day' : 'month' };
	}
	const labels = distinct(allRows, x);
	return { buckets: labels.map((l) => ({ key: l, label: l })), keyOf: (row) => text(row[x]) || undefined, unit: x.replace(/_/g, ' ') };
}

export type SeriesPoint = { key: string; label: string; total: number; parts: Record<string, number> };

/** One point per bucket: the measure over the bucket's rows, split by series when given. */
export function series(rows: Row[], b: Bucketer, m: Measure, split?: { key: string; keys: string[] }): SeriesPoint[] {
	const groups = new Map<string, Row[]>(b.buckets.map((k) => [k.key, []]));
	for (const r of rows) {
		const k = b.keyOf(r);
		if (k !== undefined) groups.get(k)?.push(r);
	}
	return b.buckets.map((bk) => {
		const inBucket = groups.get(bk.key) ?? [];
		const parts: Record<string, number> = {};
		if (split) {
			for (const s of split.keys) {
				parts[s] = aggregate(
					inBucket.filter((r) => seriesOf(r, split.key, split.keys) === s),
					m
				) ?? 0;
			}
		}
		return { key: bk.key, label: bk.label, total: aggregate(inBucket, m) ?? 0, parts };
	});
}

export type Slice = { label: string; value: number; share: number };

/** The measure per value of a column, largest first; past `max` the tail folds into Other. */
export function breakdown(rows: Row[], key: string, m: Measure, max = 8): Slice[] {
	const groups = new Map<string, Row[]>();
	for (const r of rows) {
		const v = text(r[key]);
		if (!v) continue;
		if (!groups.has(v)) groups.set(v, []);
		groups.get(v)!.push(r);
	}
	let slices = [...groups].map(([label, rs]) => ({ label, value: aggregate(rs, m) ?? 0, rows: rs }));
	slices.sort((a, b) => b.value - a.value);
	if (slices.length > max) {
		const tail = slices.slice(max - 1).flatMap((s) => s.rows);
		slices = [...slices.slice(0, max - 1), { label: OTHER, value: aggregate(tail, m) ?? 0, rows: tail }];
	}
	const whole = m.agg === 'avg' ? 0 : slices.reduce((t, s) => t + s.value, 0);
	return slices.map(({ label, value }) => ({ label, value, share: whole ? value / whole : 0 }));
}

/** Change from `prev` to `cur`; undefined when either is missing or prev is 0. */
export function trend(cur: number | undefined, prev: number | undefined, good: 'up' | 'down', label: string): Trend | undefined {
	if (cur === undefined || prev === undefined || prev === 0) return undefined;
	const pct = (cur - prev) / Math.abs(prev);
	const dir = Math.abs(pct) < 0.005 ? 'flat' : pct > 0 ? 'up' : 'down';
	const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
	const pctText = `${sign}${Math.abs(pct * 100).toFixed(Math.abs(pct) < 0.1 ? 1 : 0)}%`;
	return { dir, text: label ? `${pctText} ${label}` : pctText, good };
}

export type Kpi = { label: string; value: number | undefined; shown: string; trend?: Trend };

/**
 * One KPI per measure over the filtered rows. The trend compares against the
 * filtered `compare` rows when there are any; otherwise, when the x axis has
 * two or more buckets, the last bucket against the one before it.
 */
export function kpis(
	rows: Row[],
	measures: Measure[],
	opts: { compare?: Row[]; compareLabel?: string; bucketer?: Bucketer; currency?: string } = {}
): Kpi[] {
	const { compare = [], bucketer: b, currency } = opts;
	const last2 = !compare.length && b && b.buckets.length >= 2 ? b.buckets.slice(-2) : undefined;
	const inBucket = (k: string) => rows.filter((r) => b?.keyOf(r) === k);
	return measures.map((m) => {
		const value = aggregate(rows, m);
		let t: Trend | undefined;
		if (compare.length) {
			t = trend(value, aggregate(compare, m), m.good, opts.compareLabel || 'vs previous period');
		} else if (last2) {
			const [prev, cur] = last2;
			t = trend(aggregate(inBucket(cur.key), m), aggregate(inBucket(prev.key), m), m.good, `${cur.label} vs ${prev.label}`);
		}
		return { label: m.label, value, shown: fmt(value, m.format, currency), trend: t };
	});
}

/** Table columns: the x column, dimensions, the split, then each measured column once. */
export function defaultColumns(x: string | undefined, dims: Dimension[], split: string | undefined, measures: Measure[], xLabel?: string): Column[] {
	const cols: Column[] = [];
	const add = (c: Column) => {
		if (!cols.some((d) => d.key === c.key)) cols.push(c);
	};
	if (x) add({ key: x, label: xLabel || title(x) });
	for (const d of dims) add({ key: d.key, label: d.label });
	if (split) add({ key: split, label: title(split) });
	for (const m of measures) if (m.key) add({ key: m.key, label: m.agg === 'sum' ? m.label : title(m.key), align: 'right' });
	return cols;
}

export const title = (k: string) => k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ');

/** The measure that formats a column, preferring a summed one. */
export function measureFor(key: string, measures: Measure[]): Measure | undefined {
	return measures.find((m) => m.key === key && m.agg === 'sum') ?? measures.find((m) => m.key === key);
}

/** Column totals for the filtered rows: summed measure columns only. */
export function totals(rows: Row[], cols: Column[], measures: Measure[]): Record<string, number> {
	const out: Record<string, number> = {};
	for (const c of cols) {
		const m = measures.find((x) => x.key === c.key && x.agg === 'sum');
		if (m) out[c.key] = aggregate(rows, m) ?? 0;
	}
	return out;
}

function intl(opts: Intl.NumberFormatOptions, currency?: string): Intl.NumberFormat {
	const code = typeof currency === 'string' && /^[A-Za-z]{3}$/.test(currency.trim()) ? currency.trim().toUpperCase() : 'USD';
	try {
		return new Intl.NumberFormat(undefined, opts.style === 'currency' ? { ...opts, currency: code } : opts);
	} catch {
		return new Intl.NumberFormat(undefined, opts.style === 'currency' ? { ...opts, currency: 'USD' } : opts);
	}
}

/**
 * A value for display. Money drops cents at 100 and above; percent values are
 * 0 to 100 as written (12.5 is "12.5%"). `compact` is for axis ticks and cap
 * labels ("$12K"). Non-finite is "n/a".
 */
export function fmt(v: unknown, format: Format, currency?: string, compact = false): string {
	const n = finite(v);
	if (n === undefined) return 'n/a';
	if (format === 'percent') return `${intl({ maximumFractionDigits: 1 }).format(n)}%`;
	// Both fraction bounds are always set: a currency's default minimum (2) above
	// a smaller maximum is a RangeError on older engines.
	const cents = format === 'money' && !compact && Math.abs(n) < 100;
	const opts: Intl.NumberFormatOptions = compact
		? { notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 }
		: { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents || format === 'number' ? 2 : 0 };
	return format === 'money' ? intl({ ...opts, style: 'currency' }, currency).format(n) : intl(opts).format(n);
}

/** Clean y-axis ticks from 0 to a nice ceiling over `max` (four to six steps). */
export function ticks(max: number): number[] {
	if (!(max > 0) || !Number.isFinite(max)) return [0];
	const raw = max / 5;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw)!;
	const out: number[] = [];
	for (let t = 0; t < max + step * 0.999; t += step) out.push(+t.toFixed(10));
	return out;
}
