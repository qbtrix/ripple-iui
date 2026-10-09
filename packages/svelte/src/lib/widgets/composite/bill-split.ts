// widgets/composite/bill-split.ts — the pure half of the `bill-split` data
// widget: prop hygiene (model output in, clean BillValue out) and the split.
//
// The split works in integer cents. Each person's weight is their even part
// of the shared amount plus what they had on top (extras), so tax and tip
// follow what each person ordered. The grand total is rounded once, every
// share is floored, and the leftover cents go to the first people, so the
// shares always add up to the total exactly.
//
// Tax sits ON TOP of `subtotal` (subtotal is the pre-tax bill); the tip is a
// percent of the pre-tax subtotal. Extras that add up to more than the bill
// raise the bill to their sum, and `over` says so.
import { finite, plain } from '../data-kit/format.js';

export const MIN_PEOPLE = 2;
export const MAX_PEOPLE = 12;
export const MAX_TIP = 100;
export const DEFAULT_TIP = 18;
export const DEFAULT_TIP_OPTIONS = [15, 18, 20, 22];

export interface Person {
	id: string;
	name: string;
	/** What this person had on top of the shared part, e.g. drinks. */
	extras: number;
}

/** The bound value: everything the visitor can edit. */
export interface BillValue {
	subtotal: number;
	tip_percent: number;
	people: Person[];
}

export interface Share extends Person {
	/** What this person pays, tip and tax included, in cents. */
	cents: number;
}

export interface Split {
	shares: Share[];
	/** Cents. The bill the split used: subtotal (raised to the extras if they exceed it). */
	subtotal: number;
	tax: number;
	tip: number;
	/** subtotal + tax + tip, and exactly the sum of the shares. */
	total: number;
	/** Extras added up to more than the subtotal. */
	over: boolean;
}

const cents = (v: number) => Math.round(v * 100);
const money = (v: unknown) => Math.round(Math.max(0, finite(v) ?? 0) * 100) / 100;

export const clampTip = (v: unknown): number | undefined => {
	const n = finite(v);
	return n === undefined ? undefined : Math.min(Math.max(n, 0), MAX_TIP);
};

/** Model or bound people: at most 12, unique ids, a name, extras >= 0. */
export function toPeople(raw: unknown): Person[] {
	if (!Array.isArray(raw)) return [];
	const seen = new Set<string>();
	const out: Person[] = [];
	for (const [i, p] of raw.slice(0, MAX_PEOPLE).entries()) {
		const o = p !== null && typeof p === 'object' ? (p as Record<string, unknown>) : {};
		let id = typeof o.id === 'string' || typeof o.id === 'number' ? String(o.id).trim() : '';
		if (!id || seen.has(id)) id = nextId([...seen], i + 1);
		seen.add(id);
		out.push({ id, name: plain(o.name) || `Person ${i + 1}`, extras: money(o.extras) });
	}
	return out;
}

/** A fresh `pN` id, starting from `from`, that no one has yet. */
export function nextId(ids: readonly string[], from = ids.length + 1): string {
	let k = from;
	while (ids.includes(`p${k}`)) k++;
	return `p${k}`;
}

export function toTipOptions(raw: unknown): number[] {
	const list = Array.isArray(raw) ? raw.map(clampTip).filter((n): n is number => n !== undefined) : [];
	const clean = [...new Set(list)].slice(0, 6);
	return clean.length ? clean : DEFAULT_TIP_OPTIONS;
}

/** A clean BillValue from model props or a bound value; undefined until there is a bill and a person. */
export function toValue(raw: { subtotal?: unknown; tip_percent?: unknown; people?: unknown }): BillValue | undefined {
	const sub = finite(raw.subtotal);
	const people = toPeople(raw.people);
	if (sub === undefined || !people.length) return undefined;
	return { subtotal: money(sub), tip_percent: clampTip(raw.tip_percent) ?? DEFAULT_TIP, people };
}

/** Split a bill. Every amount out is in cents; the shares add up to `total`. */
export function split(v: BillValue, tax: unknown = 0): Split {
	const n = v.people.length;
	const ex = v.people.map((p) => cents(money(p.extras)));
	const extras = ex.reduce((a, b) => a + b, 0);
	const given = cents(money(v.subtotal));
	const subtotal = Math.max(given, extras);
	const taxC = cents(money(tax));
	const tip = Math.round((subtotal * (clampTip(v.tip_percent) ?? 0)) / 100);
	const total = subtotal + taxC + tip;
	const shared = subtotal - extras;
	// n * (shared / n + extras_i): integer weights that sum to n * subtotal.
	const w = ex.map((e) => shared + n * e);
	const W = w.reduce((a, b) => a + b, 0);
	const pay = w.map((x) => (W ? Math.floor((total * x) / W) : 0));
	if (!W && n) pay[0] = total;
	const left = total - pay.reduce((a, b) => a + b, 0);
	if (n) for (let i = 0; i < left; i++) pay[i % n]++;
	return {
		shares: v.people.map((p, i) => ({ ...p, cents: pay[i] })),
		subtotal,
		tax: taxC,
		tip,
		total,
		over: extras > given
	};
}
