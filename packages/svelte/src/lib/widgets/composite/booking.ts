// widgets/composite/booking.ts — the booking widget's data rules, free of
// Svelte so they test directly: reading store data as the store sends it
// (services, days of slots), the slot nearest the visitor's ask, and the
// request the widget emits, validated the way the host re-validates it.
//
// Every reader takes model or server output and never throws: a missing
// array is [], a half-streamed slot is dropped or unavailable, a junk value
// is ignored. Only `available === true` makes a slot bookable.
//
// Times: a slot's `start` is ISO with the store's offset, so its digits are
// already store-local time. The widget reads "HH:MM" out of the string and
// never parses a date, so the browser's clock and timezone cannot move a slot.
// Day labels come from the store's `date_label`; ISO dates only compare as
// strings.
import { dateLabel, finite, plain } from '../data-kit/format.js';

export type Service = {
	id: string;
	name: string;
	kind?: string;
	duration_min?: number;
	price?: number;
	image?: string;
	party?: Bounds;
};
export type Bounds = { min: number; max: number };
export type Slot = { start: string; label: string; available: boolean };
export type Day = { date: string; date_label: string; slots: Slot[] };
export type Preferred = { date?: string; after?: string };
export type Customer = { name: string; email?: string; phone?: string };
export type BookingRequest = {
	service_id: string;
	start: string;
	party?: number;
	customer: Customer;
	notes?: string;
};
/** The request in progress, as the bound `selection` holds it. */
export type Selection = {
	service_id?: string;
	start?: string;
	party?: number;
	customer?: { name?: string; email?: string; phone?: string };
	notes?: string;
};
export type Notice = { kind: 'error' | 'info'; text: string; code?: string; start?: string };
export type Confirmed = {
	booking_id: string;
	label?: string;
	date_label?: string;
	service_name?: string;
	party?: number;
};

export const LIMITS = { name: 80, notes: 500, email: 254 } as const;

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
const rec = (v: unknown): Record<string, unknown> | undefined =>
	v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const int = (v: unknown): number | undefined => {
	const n = finite(v);
	return n === undefined ? undefined : Math.trunc(n);
};

export function readBounds(v: unknown): Bounds | undefined {
	const b = rec(v);
	const min = Math.max(int(b?.min) ?? 1, 1);
	const max = int(b?.max);
	return b && max !== undefined && max >= min ? { min, max } : undefined;
}

export function readServices(v: unknown): Service[] {
	return list(v).flatMap((raw) => {
		const s = rec(raw);
		if (!s) return [];
		return [
			{
				id: str(s.id),
				name: plain(s.name),
				kind: str(s.kind) || undefined,
				duration_min: finite(s.duration_min),
				price: finite(s.price),
				image: str(s.image) || undefined,
				party: readBounds(s.party)
			}
		];
	});
}

export function readDays(v: unknown): Day[] {
	return list(v).flatMap((raw) => {
		const d = rec(raw);
		if (!d) return [];
		const date = str(d.date);
		const slots = list(d.slots).flatMap((x) => {
			const s = rec(x);
			const start = str(s?.start);
			if (!s || !start) return [];
			return [{ start, label: plain(s.label) || clockLabel(start), available: s.available === true }];
		});
		// The store writes `date_label`; the design doc's `label` is read too.
		return [{ date, date_label: plain(d.date_label) || plain(d.label) || dateLabel(date), slots }];
	});
}

export function readNotice(v: unknown): Notice | undefined {
	const n = rec(v);
	const text = plain(n?.text) || plain(n?.message);
	if (!n || !text) return undefined;
	return { kind: n.kind === 'info' ? 'info' : 'error', text, code: str(n.code) || undefined, start: str(n.start) || undefined };
}

export function readConfirmed(v: unknown): Confirmed | undefined {
	const c = rec(v);
	const booking_id = plain(c?.booking_id);
	if (!c || !booking_id) return undefined;
	return {
		booking_id,
		label: plain(c.label) || undefined,
		date_label: plain(c.date_label) || undefined,
		service_name: plain(c.service_name) || undefined,
		party: int(c.party)
	};
}

export function readSelection(v: unknown): Selection {
	const s = rec(v);
	const c = rec(s?.customer);
	return {
		service_id: str(s?.service_id) || undefined,
		start: str(s?.start) || undefined,
		party: int(s?.party),
		customer: { name: str(c?.name), email: str(c?.email), phone: str(c?.phone) },
		notes: str(s?.notes)
	};
}

/** A host notice that says the slot just went: `code: 'slot_taken'`, or text that says "taken". */
export function isSlotTaken(n: Notice | undefined): boolean {
	return !!n && n.kind === 'error' && (n.code === 'slot_taken' || (!n.code && /\btaken\b/i.test(n.text)));
}

/** Minutes after midnight from "HH:MM" (or the time part of an ISO string), store-local. */
export function clock(v: unknown): number | undefined {
	const m = /(?:^|T)(\d{1,2}):(\d{2})/.exec(str(v));
	if (!m) return undefined;
	const h = Number(m[1]);
	const min = Number(m[2]);
	return h < 24 && min < 60 ? h * 60 + min : undefined;
}

function clockLabel(start: string): string {
	const m = clock(start);
	if (m === undefined) return start;
	const h = Math.floor(m / 60);
	return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const isOpen = (s: Slot, taken: ReadonlySet<string>) => s.available && !taken.has(s.start);

/**
 * The open slot nearest the visitor's ask: the first day on or after
 * `preferred.date` with an open slot, then the slot closest to
 * `preferred.after` there (a tie goes to the later slot, since the ask says
 * "after"). Undefined without an ask, or when nothing is open from that day on.
 */
export function nearest(days: readonly Day[], pref: Preferred | undefined, taken: ReadonlySet<string>) {
	const date = str(pref?.date);
	const want = clock(pref?.after);
	if (!date && want === undefined) return undefined;
	const from = date ? days.findIndex((d) => d.date >= date) : 0;
	if (from < 0) return undefined;
	for (const day of days.slice(from)) {
		const open = day.slots.filter((s) => isOpen(s, taken));
		if (open.length === 0) continue;
		let best = open[0];
		if (want !== undefined) {
			let gap = Infinity;
			for (const s of open) {
				const m = clock(s.start);
				if (m === undefined) continue;
				const g = m >= want ? m - want : want - m + 0.5;
				if (g < gap) [best, gap] = [s, g];
			}
		}
		return { date: day.date, start: best.start };
	}
	return undefined;
}

/** Slots grouped by part of the day, store-local; keeps each slot's index for keys. */
export function partsOfDay(slots: readonly Slot[]) {
	const groups: Array<{ name: string; slots: Array<{ slot: Slot; i: number }> }> = [];
	slots.forEach((slot, i) => {
		const m = clock(slot.start);
		const name = m === undefined ? '' : m < 720 ? 'Morning' : m < 1020 ? 'Afternoon' : 'Evening';
		const last = groups.at(-1);
		if (last?.name === name) last.slots.push({ slot, i });
		else groups.push({ name, slots: [{ slot, i }] });
	});
	return groups;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s().-]+$/;

export type Errors = Partial<Record<'name' | 'contact' | 'email' | 'phone' | 'notes', string>>;

/** The visitor's details, checked the way the host re-checks them. */
export function checkDetails(sel: Selection): Errors {
	const name = sel.customer?.name?.trim() ?? '';
	const email = sel.customer?.email?.trim() ?? '';
	const phone = sel.customer?.phone?.trim() ?? '';
	const digits = phone.replace(/\D/g, '').length;
	const e: Errors = {};
	if (!name) e.name = 'Add the name for the booking.';
	else if (name.length > LIMITS.name) e.name = `Keep the name under ${LIMITS.name} characters.`;
	if (!email && !phone) e.contact = 'Add an email or a phone number.';
	if (email && (email.length > LIMITS.email || !EMAIL.test(email))) e.email = 'That email looks incomplete.';
	if (phone && (!PHONE.test(phone) || digits < 7 || digits > 15)) e.phone = 'That phone number looks incomplete.';
	if ((sel.notes?.length ?? 0) > LIMITS.notes) e.notes = `Notes can be up to ${LIMITS.notes} characters.`;
	return e;
}

/** The request to emit, or undefined while anything is missing or invalid. */
export function toRequest(sel: Selection, service: Service | undefined): BookingRequest | undefined {
	if (!service?.id || !sel.start || Object.keys(checkDetails(sel)).length > 0) return undefined;
	const b = service.party;
	if (b && (sel.party === undefined || sel.party < b.min || sel.party > b.max)) return undefined;
	const c = sel.customer ?? {};
	const email = c.email?.trim();
	const phone = c.phone?.trim();
	const notes = sel.notes?.trim();
	return {
		service_id: service.id,
		start: sel.start,
		...(b && { party: sel.party }),
		customer: { name: c.name?.trim() ?? '', ...(email && { email }), ...(phone && { phone }) },
		...(notes && { notes })
	};
}
