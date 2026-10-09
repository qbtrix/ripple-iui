// widgets/composite/habit-tracker.ts: the maths behind the habit-tracker
// widget: local-calendar ISO days, weeks that start on Monday or Sunday,
// streaks, weekly targets, and the normaliser that turns model props (or a
// bound value) into a clean HabitValue.
//
// Invariants:
// - A day is a local-calendar `YYYY-MM-DD` built from getFullYear/getMonth/
//   getDate, never toISOString (that is UTC and shifts the day near midnight).
// - A streak counts consecutive ticked days ending today; an unticked today
//   does not break it yet (it ends yesterday instead).
// - No storage: the value lives in props and widget state only.
import { finite, plain } from '../data-kit/format.js';
import { HABIT_ICONS, type HabitIconKey } from '../data-kit/icons.js';
import { list, rec } from './recipe.js';

export const MAX_HABITS = 8;
export const MAX_WEEKS = 4;
/** How far back a seed offset may reach, in days. */
export const MAX_SEED_DAYS = 366;

export type WeekStart = 'mon' | 'sun';

export interface Habit {
	id: string;
	name: string;
	icon?: HabitIconKey;
	target_per_week: number;
}

export interface HabitValue {
	habits: Habit[];
	/** Ticked local days per habit id, ISO `YYYY-MM-DD`, sorted, no repeats. */
	ticks: Record<string, string[]>;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, '0');

export const isoDay = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fromIso(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
	const d = fromIso(iso);
	d.setDate(d.getDate() + n);
	return isoDay(d);
}

export function weekStartOf(iso: string, start: WeekStart): string {
	const dow = fromIso(iso).getDay();
	return addDays(iso, -(start === 'sun' ? dow : (dow + 6) % 7));
}

export const weekDays = (startIso: string): string[] => Array.from({ length: 7 }, (_, i) => addDays(startIso, i));

export function currentStreak(ticks: ReadonlySet<string>, today: string): number {
	let d = ticks.has(today) ? today : addDays(today, -1);
	let n = 0;
	while (ticks.has(d)) {
		n++;
		d = addDays(d, -1);
	}
	return n;
}

export function longestStreak(ticks: Iterable<string>): number {
	let best = 0;
	let run = 0;
	let prev = '';
	for (const d of [...new Set(ticks)].sort()) {
		run = prev && addDays(prev, 1) === d ? run + 1 : 1;
		best = Math.max(best, run);
		prev = d;
	}
	return best;
}

export const countIn = (ticks: ReadonlySet<string>, days: readonly string[]) => days.filter((d) => ticks.has(d)).length;

/** Met, or still reachable in the days left this week (today included). */
export const onTrack = (done: number, target: number, daysLeft: number) => done >= target || target - done <= daysLeft;

export const clampTarget = (v: unknown): number => {
	const n = finite(v);
	return n === undefined ? 7 : Math.min(Math.max(Math.round(n), 1), 7);
};

export const isHabitIcon = (v: unknown): v is HabitIconKey => typeof v === 'string' && Object.hasOwn(HABIT_ICONS, v);

/** The first free `hN` id. */
export function nextHabitId(habits: readonly { id: string }[]): string {
	const used = new Set(habits.map((h) => h.id));
	let n = habits.length + 1;
	while (used.has(`h${n}`)) n++;
	return `h${n}`;
}

/** Up to 8 named habits with unique ids; id-less ones get `h${index + 1}`. */
export function readHabits(raw: unknown): Habit[] {
	const out: Habit[] = [];
	const ids = new Set<string>();
	list(raw).forEach((r, i) => {
		if (out.length >= MAX_HABITS) return;
		const h = typeof r === 'string' ? { name: r } : rec(r);
		const name = plain(h.name).slice(0, 60);
		if (!name) return;
		let id = typeof h.id === 'string' || typeof h.id === 'number' ? String(h.id).trim() : '';
		if (!id) id = `h${i + 1}`;
		if (ids.has(id)) id = `${id}-${i}`;
		ids.add(id);
		out.push({ id, name, ...(isHabitIcon(h.icon) ? { icon: h.icon } : {}), target_per_week: clampTarget(h.target_per_week) });
	});
	return out;
}

const cleanDays = (days: Iterable<unknown>) =>
	[...new Set([...days].filter((d): d is string => typeof d === 'string' && ISO.test(d) && isoDay(fromIso(d)) === d))].sort();

/** Valid ISO days for known habit ids only. */
export function readTicks(raw: unknown, habits: readonly Habit[]): Record<string, string[]> {
	const r = rec(raw);
	return Object.fromEntries(habits.map((h) => [h.id, cleanDays(list(r[h.id]))]));
}

/** `seed` offsets (0 = today, 1 = yesterday) as ISO days back from `today`. */
export function seedTicks(seed: unknown, habits: readonly Habit[], today: string): Record<string, string[]> {
	const r = rec(seed);
	return Object.fromEntries(
		habits.map((h) => [
			h.id,
			cleanDays(
				list(r[h.id]).flatMap((v) => {
					const n = finite(v);
					return n === undefined || n < 0 || n > MAX_SEED_DAYS ? [] : [addDays(today, -Math.round(n))];
				})
			)
		])
	);
}

/** A bound or edited value, cleaned; undefined when it carries no habits key. */
export function toValue(raw: unknown): HabitValue | undefined {
	const r = rec(raw);
	if (!Array.isArray(r.habits)) return undefined;
	const habits = readHabits(r.habits);
	return { habits, ticks: readTicks(r.ticks, habits) };
}

/** A copy of `value` with `day` ticked or unticked for habit `id`. */
export function toggleTick(value: HabitValue, id: string, day: string): HabitValue {
	const days = value.ticks[id] ?? [];
	const next = days.includes(day) ? days.filter((d) => d !== day) : cleanDays([...days, day]);
	return { ...value, ticks: { ...value.ticks, [id]: next } };
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Tuesday 14 October". English and fixed, so server and client agree. */
export function dayLong(iso: string): string {
	const d = fromIso(iso);
	return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Tue". */
export const dayShort = (iso: string) => WEEKDAYS[fromIso(iso).getDay()].slice(0, 3);

/** "13 to 19 Oct", "29 Sep to 5 Oct". */
export function weekRange(days: readonly string[]): string {
	const a = fromIso(days[0]);
	const b = fromIso(days[6]);
	const m = (d: Date) => MONTHS[d.getMonth()].slice(0, 3);
	return a.getMonth() === b.getMonth() ? `${a.getDate()} to ${b.getDate()} ${m(b)}` : `${a.getDate()} ${m(a)} to ${b.getDate()} ${m(b)}`;
}
