// widgets/composite/recipe.ts — the data rules shared by `recipe` and
// `meal-plan` (design doc 2026-10-09 §3.6): reading model rows, scaling
// quantities, formatting them as cooks write them, and the meal plan's sums.
//
// Invariants:
// - Quantities are numbers with a separate unit. Scaling multiplies the number;
//   nothing parses "1 1/2 cups" out of a string (ocean-flow's regex bug).
// - Ingredient quantities scale by `people / serves`. Nutrition (`kcal`,
//   `protein_g`) is per serving and never scales: a day's total is per person,
//   and `goal` is per person per day.
// - A recipe with no usable `serves` is not scaled (factor 1): its quantities
//   are shown and summed as written rather than guessed.
// - The shopping list sums by normalised `name|unit` ("cups" and "cup" are one
//   unit); the same name in another unit stays its own row. That key is also what a tick (`got`) remembers, so a
//   swap never moves a tick onto another item.
// - Every reader takes `unknown` and never throws: props are model output.
// - A widget's own edit of a non-bound prop (a swap, a tick) is an `Edit`
//   (data-kit/edit.ts).
import { finite, plain } from '../data-kit/format.js';
import type { AisleKind, MealKind } from '../data-kit/icons.js';
import type { Status } from '../data-kit/types.js';

export type Slot = MealKind;
export type Aisle = AisleKind;

export interface Ingredient {
	id?: string;
	name: string;
	qty?: number;
	unit?: string;
	note?: string;
	aisle?: Aisle;
}
export interface RecipeStep {
	id?: string;
	text: string;
	minutes?: number;
	tip?: string;
}
export interface RecipeData {
	id: string;
	name: string;
	kind?: Slot;
	image?: string;
	minutes?: number;
	serves: number;
	/** Per serving. */
	kcal?: number;
	/** Per serving. */
	protein_g?: number;
	tags?: string[];
	ingredients: Ingredient[];
	steps?: RecipeStep[];
}
export interface PlanMeal {
	id?: string;
	slot: Slot;
	/** A recipe id (or name) from `recipes`. */
	recipe: string;
}
export interface PlanDay {
	id?: string;
	/** "Mon", "Monday 12 Oct": shown as written. `label` is read too. */
	day: string;
	meals: PlanMeal[];
}
/** Per person per day. */
export interface Goal {
	kcal?: number;
	protein_g?: number;
}

export const SLOTS: readonly Slot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const AISLES: readonly Aisle[] = ['produce', 'protein', 'dairy', 'grains', 'pantry', 'frozen', 'other'];

export function rec(v: unknown): Record<string, unknown> {
	return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function list(v: unknown): unknown[] {
	return Array.isArray(v) ? v : [];
}

export const toAisle = (v: unknown): Aisle => ((AISLES as readonly unknown[]).includes(v) ? (v as Aisle) : 'other');

const word = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
/** "breakfast" → "Breakfast"; an unknown slot shows as written. */
export const slotLabel = (slot: string) => word(slot);

/** A positive count, else undefined. */
export function positive(v: unknown): number | undefined {
	const n = finite(v);
	return n !== undefined && n > 0 ? n : undefined;
}

/** How much to multiply the written quantities by; 1 when `serves` is unusable. */
export function scaleFactor(want: unknown, serves: unknown): number {
	const base = positive(serves);
	const n = positive(want);
	return base && n ? n / base : 1;
}

// Metric and weight units read best as decimals; cups and spoons as fractions.
const DECIMAL_UNITS = /^(g|gr|grams?|kg|mg|ml|millilit(?:er|re)s?|l|lit(?:er|re)s?|cl|dl|oz|lbs?)$/i;
const FRACTIONS: readonly [number, string][] = [
	[1 / 8, '⅛'],
	[1 / 4, '¼'],
	[1 / 3, '⅓'],
	[1 / 2, '½'],
	[2 / 3, '⅔'],
	[3 / 4, '¾']
];

function decimal(n: number, digits: number): string {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(n);
}

/**
 * A quantity as a cook writes it: 1.5 cups → "1½", 0.333 tsp → "⅓",
 * 562.5 g → "563", 1.25 kg → "1.25". Missing or non-finite → ''.
 */
export function formatQty(qty: unknown, unit?: unknown): string {
	const q = finite(qty);
	if (q === undefined || q < 0) return '';
	if (typeof unit === 'string' && DECIMAL_UNITS.test(unit.trim())) return decimal(q, q >= 10 ? 0 : 2);
	if (q >= 20) return decimal(q, 0);
	const whole = Math.floor(q);
	const rest = q - whole;
	if (rest < 0.04) return whole ? String(whole) : decimal(q, 2);
	if (rest > 0.96) return String(whole + 1);
	const near = FRACTIONS.find(([v]) => Math.abs(rest - v) < 0.04);
	return near ? `${whole || ''}${near[1]}` : decimal(q, 2);
}

// Counted units read singular at one and plural above it ("1 can", "2 cans");
// a model writes either form. tbsp, tsp and metric units never change.
const COUNTED = new Set(['cup', 'can', 'clove', 'slice', 'head', 'jar', 'bunch', 'pinch', 'sprig', 'stick', 'pack', 'bag', 'fillet', 'piece', 'tin', 'handful', 'bottle', 'scoop']);
const singular = (u: string) => (u.endsWith('es') && COUNTED.has(u.slice(0, -2)) ? u.slice(0, -2) : u.endsWith('s') && COUNTED.has(u.slice(0, -1)) ? u.slice(0, -1) : u);

/** The unit a sum is kept under: lowercased, a counted unit in its singular. */
export function baseUnit(unit: unknown): string {
	return singular(plain(unit).toLowerCase());
}

/** The unit as written, made singular or plural to agree with the quantity. */
export function unitFor(qty: number | undefined, unit: unknown): string {
	const u = plain(unit);
	const one = singular(u.toLowerCase());
	if (qty === undefined || !COUNTED.has(one)) return u;
	return qty > 1 ? (/(ch|sh)$/.test(one) ? `${one}es` : `${one}s`) : one;
}

/** "1½ cups", "400 g", "2 eggs" (unit-less), or just the unit when there is no number. */
export function qtyLabel(qty: unknown, unit?: unknown): string {
	const n = formatQty(qty, unit);
	// Agree with the number as printed: 1.02 prints "1", so "1 cup".
	return [n, unitFor(n ? (n === '1' ? 1 : finite(qty)) : undefined, unit)].filter(Boolean).join(' ');
}

export interface IngredientRow {
	key: string;
	name: string;
	qty?: number;
	unit: string;
	note: string;
	aisle: Aisle;
}

/** Ingredient rows with a name; a nameless (mid-stream, junk) row is dropped. */
export function readIngredients(v: unknown): IngredientRow[] {
	return list(v).flatMap((raw, i) => {
		const r = rec(raw);
		const name = plain(r.name);
		if (!name) return [];
		return [{ key: `${plain(r.id)}:${i}`, name, qty: finite(r.qty), unit: plain(r.unit), note: plain(r.note), aisle: toAisle(r.aisle) }];
	});
}

export interface StepRow {
	key: string;
	i: number;
	text: string;
	minutes?: number;
	tip: string;
}

/** Steps with text; `i` keeps the written position so `done` indexes stay stable. */
export function readSteps(v: unknown): StepRow[] {
	return list(v).flatMap((raw, i) => {
		const r = typeof raw === 'string' ? { text: raw } : rec(raw);
		const text = plain(r.text);
		if (!text) return [];
		return [{ key: `${plain(r.id)}:${i}`, i, text, minutes: positive(r.minutes), tip: plain(r.tip) }];
	});
}

export interface LibraryRecipe {
	key: string;
	/** What a meal writes to point at this recipe: the id, else the name. */
	ref: string;
	raw: Record<string, unknown>;
	name: string;
	kind?: string;
	serves?: number;
	kcal?: number;
	protein?: number;
	minutes?: number;
}

/** The recipe library: rows with a name or an id, in written order. */
export function readLibrary(v: unknown): LibraryRecipe[] {
	return list(v).flatMap((raw, i) => {
		const r = rec(raw);
		const id = plain(r.id);
		const name = plain(r.name);
		if (!id && !name) return [];
		return [
			{
				key: `${id}:${i}`,
				ref: id || name,
				raw: r,
				name: name || id,
				kind: typeof r.kind === 'string' ? r.kind : undefined,
				serves: positive(r.serves),
				kcal: finite(r.kcal),
				protein: finite(r.protein_g),
				minutes: positive(r.minutes)
			}
		];
	});
}

/** A meal's recipe by id, else by name (models often write the name). */
export function findRecipe(lib: readonly LibraryRecipe[], ref: unknown): LibraryRecipe | undefined {
	const s = plain(ref);
	if (!s) return undefined;
	const lower = s.toLowerCase();
	return lib.find((r) => plain(r.raw.id) === s) ?? lib.find((r) => r.name.toLowerCase() === lower);
}

export const dayLabel = (day: unknown, i: number): string => {
	const d = rec(day);
	return plain(d.day) || plain(d.label) || `Day ${i + 1}`;
};

/** Per person: the sum of each resolved meal's per-serving values. */
export function dayTotals(day: unknown, lib: readonly LibraryRecipe[]): { kcal?: number; protein?: number } {
	let kcal: number | undefined;
	let protein: number | undefined;
	for (const m of list(rec(day).meals)) {
		const r = findRecipe(lib, rec(m).recipe);
		if (r?.kcal !== undefined) kcal = (kcal ?? 0) + r.kcal;
		if (r?.protein !== undefined) protein = (protein ?? 0) + r.protein;
	}
	return { kcal, protein };
}

export interface GoalCheck {
	status: Status;
	word: string;
}

/**
 * Protein is a floor: met at 100%, close from 85%, short below.
 * Calories are a target: on target within 10%, close within 20%, else over or under.
 */
export function goalCheck(value: number | undefined, goal: unknown, mode: 'floor' | 'target'): GoalCheck | undefined {
	const g = positive(goal);
	if (value === undefined || !g) return undefined;
	const r = value / g;
	if (mode === 'floor') {
		return r >= 1 ? { status: 'good', word: 'Goal met' } : r >= 0.85 ? { status: 'warn', word: 'Close' } : { status: 'bad', word: 'Short' };
	}
	const off = Math.abs(r - 1);
	if (off <= 0.1) return { status: 'good', word: 'On target' };
	if (off <= 0.2) return { status: 'warn', word: 'Close' };
	return { status: 'bad', word: r > 1 ? 'Over' : 'Under' };
}

export interface ShopItem {
	key: string;
	name: string;
	unit: string;
	/** Summed and scaled; undefined when no use gave a number ("to taste"). */
	qty?: number;
	aisle: Aisle;
	/** How many planned meals use it. */
	uses: number;
}

export const shopKey = (name: string, unit: string) => `${name.trim().toLowerCase()}|${baseUnit(unit)}`;

/**
 * The shopping list: every planned meal's ingredients, each quantity times
 * `people / serves`, summed by name + unit, grouped by aisle in store order and
 * sorted by name. A meal whose recipe is missing adds nothing.
 */
export function shoppingList(days: unknown, lib: readonly LibraryRecipe[], people: number): { aisle: Aisle; items: ShopItem[] }[] {
	const items = new Map<string, ShopItem>();
	for (const day of list(days)) {
		for (const m of list(rec(day).meals)) {
			const r = findRecipe(lib, rec(m).recipe);
			if (!r) continue;
			const f = scaleFactor(people, r.serves);
			for (const ing of readIngredients(r.raw.ingredients)) {
				const key = shopKey(ing.name, ing.unit);
				let item = items.get(key);
				if (!item) {
					item = { key, name: ing.name, unit: ing.unit, aisle: ing.aisle, uses: 0 };
					items.set(key, item);
				}
				if (ing.qty !== undefined && ing.qty >= 0) item.qty = (item.qty ?? 0) + ing.qty * f;
				if (item.aisle === 'other') item.aisle = ing.aisle;
				item.uses++;
			}
		}
	}
	const all = [...items.values()];
	return AISLES.map((aisle) => ({
		aisle,
		items: all.filter((i) => i.aisle === aisle).toSorted((a, b) => a.name.localeCompare(b.name))
	})).filter((g) => g.items.length);
}

/** A new days array with one meal pointing at another recipe; nothing is mutated. */
export function swapMeal(days: unknown, di: number, mi: number, ref: string): unknown[] {
	return list(days).map((d, i) =>
		i !== di ? d : { ...rec(d), meals: list(rec(d).meals).map((m, j) => (j === mi ? { ...rec(m), recipe: ref } : m)) }
	);
}
