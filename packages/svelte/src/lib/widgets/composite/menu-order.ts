// widgets/composite/menu-order.ts — the pure half of the menu-order widget
// (design doc 2026-10-09 §3.3, §4): normalising model/store data, option
// picks, pricing, cart lines and the contact check. No Svelte, no DOM, so the
// money math is tested on its own.
//
// Pricing mirrors the store's priceLine (tasty-bite-demo src/lib/server/
// options.ts): unit price = round(price * 100) + Σ round(price_delta * 100) in
// integer cents, chosen options in menu order (group, then option). Every
// number here is DISPLAY ONLY: the store reprices every line and option at
// checkout, so a wrong total on the card can never charge a wrong amount.
//
// Invariants: a cart line always names a product_id that is on the menu, its
// option_ids are known ids in menu order within each group's limit, qty is
// 1..20, there are at most 30 lines, and unit_price is recomputed from the
// menu, never read from bound data.
import { finite, plain } from '../data-kit/format.js';

export type Fulfilment = 'pickup' | 'delivery';
export const MAX_QTY = 20;
export const MAX_LINES = 30;

/** An option group as the store sends it. */
export interface MenuOptionGroup {
	id: string;
	name: string;
	choose: 'one' | 'many';
	required?: boolean;
	max?: number;
	options: Array<{ id: string; name: string; price_delta?: number }>;
}

/** A menu item as the model or the store's hydration writes it. */
export interface MenuItem {
	id?: string;
	product_id?: string;
	name?: string;
	description?: string;
	/** A number in the widget; hydration converts the store's "11.99". */
	price?: number;
	image?: string;
	category?: string;
	tags?: string[];
	kind?: 'main' | 'side' | 'drink' | 'dessert' | 'product';
	featured?: boolean;
	groups?: MenuOptionGroup[];
}

export interface CartLine {
	product_id: string;
	name: string;
	qty: number;
	option_ids: string[];
	unit_price: number;
}

/** What `bind` holds: lines and fulfilment, never the customer's details. */
export interface CartDraft {
	lines: CartLine[];
	fulfilment?: Fulfilment;
	total?: number;
}

/** What on_checkout carries; the host turns it into the `checkout` event. */
export interface Cart {
	lines: CartLine[];
	fulfilment: Fulfilment;
	customer: { name: string; email?: string; phone?: string; address?: string };
	total: number;
}

export interface Contact {
	name: string;
	email: string;
	phone: string;
	address: string;
}

export interface Option {
	id: string;
	name: string;
	delta: number;
}

export interface Group {
	key: string;
	name: string;
	choose: 'one' | 'many';
	required: boolean;
	/** 1 for a `one` group; the cap (default: every option) for a `many` group. */
	max: number;
	options: Option[];
}

export interface Item {
	key: string;
	id?: string;
	product_id?: string;
	name: string;
	description: string;
	price?: number;
	image?: unknown;
	category: string;
	tags: string[];
	kind?: string;
	featured: boolean;
	groups: Group[];
}

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const cents = (n: number): number => Math.round(n * 100);

function toGroups(v: unknown): Group[] {
	return list(v)
		.filter(isObj)
		.map((g, i) => {
			const options = list(g.options)
				.filter(isObj)
				.flatMap((o) => {
					const id = str(o.id);
					return id ? [{ id, name: plain(o.name) || id, delta: finite(o.price_delta) ?? 0 }] : [];
				});
			const choose = g.choose === 'many' ? 'many' : 'one';
			const max = choose === 'many' ? Math.max(1, Math.trunc(finite(g.max) ?? options.length)) : 1;
			return { key: str(g.id) || `g${i}`, name: plain(g.name), choose, required: g.required === true, max, options };
		});
}

/** Model/store items to the shape the widget renders. Junk entries drop; partial ones render. */
export function toItems(v: unknown): Item[] {
	return list(v)
		.filter(isObj)
		.map((it, i) => {
			const id = str(it.id) || undefined;
			const product_id = str(it.product_id) || undefined;
			return {
				key: `${id ?? ''}:${i}`,
				id,
				product_id,
				name: plain(it.name),
				description: plain(it.description),
				price: finite(it.price),
				image: it.image,
				category: plain(it.category),
				tags: list(it.tags).map(plain).filter(Boolean).slice(0, 3),
				kind: typeof it.kind === 'string' ? it.kind : undefined,
				featured: it.featured === true,
				groups: toGroups(it.groups)
			};
		});
}

/** The model's pick (`{id, reason}`) first, else the store's first `featured` item. */
export function featuredOf(items: Item[], featured: unknown): { item: Item; reason: string } | undefined {
	const id = isObj(featured) ? str(featured.id) : '';
	const picked = id ? items.find((i) => i.id === id || i.product_id === id) : undefined;
	if (picked) return { item: picked, reason: plain(isObj(featured) ? featured.reason : '') };
	const flagged = items.find((i) => i.featured);
	return flagged ? { item: flagged, reason: '' } : undefined;
}

export function toFulfilment(v: unknown): Fulfilment[] {
	const modes = (['pickup', 'delivery'] as const).filter((m) => list(v).includes(m));
	return modes.length ? modes : ['pickup'];
}

/** `fee` as `{ delivery }` (design doc) or a bare number; never negative. */
export function deliveryFee(fee: unknown): number {
	return Math.max(0, finite(isObj(fee) ? fee.delivery : fee) ?? 0);
}

/** Known ids only, in menu order, each group cut to its limit. */
export function cleanIds(groups: Group[], ids: unknown): string[] {
	const chosen = new Set(list(ids).filter((x): x is string => typeof x === 'string'));
	return groups.flatMap((g) =>
		g.options
			.filter((o) => chosen.has(o.id))
			.slice(0, g.max)
			.map((o) => o.id)
	);
}

/** Required groups start on their first option; everything else starts empty. */
export function defaultIds(groups: Group[]): string[] {
	return groups.flatMap((g) => (g.required && g.options[0] ? [g.options[0].id] : []));
}

/** The first required group with nothing chosen: the reason "Add" is blocked. */
export function unmet(groups: Group[], ids: readonly string[]): Group | undefined {
	return groups.find((g) => g.required && !g.options.some((o) => ids.includes(o.id)));
}

/** A `one` group swaps its choice; a `many` group toggles, refusing past its max. */
export function toggleOption(groups: Group[], ids: readonly string[], group: Group, optionId: string): string[] {
	const own = new Set(group.options.map((o) => o.id));
	const mine = ids.filter((id) => own.has(id));
	const rest = ids.filter((id) => !own.has(id));
	let next: string[];
	if (group.choose === 'one') next = [optionId];
	else if (mine.includes(optionId)) next = mine.filter((id) => id !== optionId);
	else next = mine.length < group.max ? [...mine, optionId] : mine;
	return cleanIds(groups, [...rest, ...next]);
}

/** Clears an optional group (a radio cannot be unchecked by clicking it). */
export function clearGroup(groups: Group[], ids: readonly string[], group: Group): string[] {
	const own = new Set(group.options.map((o) => o.id));
	return cleanIds(
		groups,
		ids.filter((id) => !own.has(id))
	);
}

/** Unit price the way the store computes it. Undefined while the price is unknown. */
export function unitPrice(item: Item, ids: readonly string[]): number | undefined {
	if (item.price === undefined) return undefined;
	const deltas = item.groups.flatMap((g) => g.options).filter((o) => ids.includes(o.id));
	return (cents(item.price) + deltas.reduce((s, o) => s + cents(o.delta), 0)) / 100;
}

export const lineKey = (l: { product_id: string; option_ids: readonly string[] }): string =>
	`${l.product_id}|${l.option_ids.join(',')}`;

/**
 * Cart lines from bound, preset or edited data, re-derived from the menu.
 * Unknown products and unpriced items drop, option ids are cleaned and a
 * missing required choice takes its default, qty < 1 drops and qty > 20
 * clamps, a repeated product+options merges, and lines past 30 drop.
 */
export function toLines(raw: unknown, items: Item[]): CartLine[] {
	const out: CartLine[] = [];
	for (const r of list(raw)) {
		if (!isObj(r)) continue;
		const pid = str(r.product_id);
		const item = pid ? items.find((i) => i.product_id === pid) : undefined;
		if (!item) continue;
		let ids = cleanIds(item.groups, r.option_ids);
		const missing = item.groups.filter((g) => g === unmet([g], ids));
		if (missing.length) ids = cleanIds(item.groups, [...ids, ...defaultIds(missing)]);
		const unit = unitPrice(item, ids);
		const qty = Math.trunc(finite(r.qty) ?? 1);
		if (unit === undefined || qty < 1) continue;
		const line: CartLine = { product_id: pid, name: item.name || pid, qty: Math.min(qty, MAX_QTY), option_ids: ids, unit_price: unit };
		const same = out.find((l) => lineKey(l) === lineKey(line));
		if (same) same.qty = Math.min(same.qty + line.qty, MAX_QTY);
		else if (out.length < MAX_LINES) out.push(line);
	}
	return out;
}

/** The model's `preset` ("two burgers") as raw lines; ids match `id` or `product_id`. */
export function presetLines(preset: unknown, items: Item[]): Array<{ product_id?: string; qty: unknown }> {
	return list(preset)
		.filter(isObj)
		.map((p) => {
			const id = str(p.id);
			return { product_id: items.find((i) => id && (i.id === id || i.product_id === id))?.product_id, qty: p.qty };
		});
}

export function itemCount(lines: readonly CartLine[]): number {
	return lines.reduce((n, l) => n + l.qty, 0);
}

export function subtotalOf(lines: readonly CartLine[]): number {
	return lines.reduce((s, l) => s + cents(l.unit_price) * l.qty, 0) / 100;
}

/** Display only: the store reprices every line and adds its own fee. */
export function totalOf(lines: readonly CartLine[], mode: Fulfilment, fee: number): number {
	return (cents(subtotalOf(lines)) + (mode === 'delivery' ? cents(fee) : 0)) / 100;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field → message for what blocks the review step. Empty object when ready. */
export function contactErrors(c: Contact, mode: Fulfilment): Partial<Record<keyof Contact, string>> {
	const e: Partial<Record<keyof Contact, string>> = {};
	const email = c.email.trim();
	const phone = c.phone.trim();
	if (!c.name.trim()) e.name = 'Add a name for the order.';
	if (email && !EMAIL.test(email)) e.email = 'That email looks incomplete.';
	if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7))
		e.phone = 'Use digits, spaces and an optional +.';
	if (!email && !phone) e.email = 'Add an email or a phone number so the kitchen can reach you.';
	if (mode === 'delivery' && !c.address.trim()) e.address = 'Add the delivery address.';
	return e;
}

/** The checkout payload. The host re-validates it; the store reprices it. */
export function buildCart(lines: readonly CartLine[], mode: Fulfilment, c: Contact, fee: number): Cart {
	const customer: Cart['customer'] = { name: c.name.trim().slice(0, 80) };
	if (c.email.trim()) customer.email = c.email.trim().slice(0, 120);
	if (c.phone.trim()) customer.phone = c.phone.trim().slice(0, 30);
	if (mode === 'delivery' && c.address.trim()) customer.address = c.address.trim().slice(0, 200);
	return {
		lines: lines.map((l) => ({ ...l, option_ids: [...l.option_ids] })),
		fulfilment: mode,
		customer,
		total: totalOf(lines, mode, fee)
	};
}
