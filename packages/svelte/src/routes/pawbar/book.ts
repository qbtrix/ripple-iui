// routes/pawbar/book.ts — The landing's `book` host event: a chat card's
// `booking` widget emits a BookingRequest, and the host (never the card) books
// it at the test store, `${storeUrl}/api/bookings`, with no redirect.
//
// toBookingRequest() re-checks the request the way the store does (ids, an ISO
// start with an offset, party, name 1-80, a well-formed email or phone, notes
// up to 500). book() POSTs it and turns every answer into either the confirmed
// booking (201) or a notice for the widget: 409 slot_taken carries
// `code: 'slot_taken'` and the start, so the widget goes back to the times with
// that slot Full; 400 carries the store's message, and `reload` when it is
// about the time, so the host refetches the slots; 429, 5xx and a network
// failure get a calm retry line. Every call returns a NEW notice object: the
// widget reacts to identity.
//
// The host answers the widget by patching the card's spec (patchBooking): the
// booking node's props get `notice` or `confirmed` (and fresh `days`), and the
// widget keeps the visitor's draft across the re-sent spec. bookingIcs() is the
// "Add to calendar" file, built from the store's answer, in UTC.

import type { BookingRequest, Confirmed, Day, Notice } from '$lib/widgets/composite/booking.js';

export const BOOKINGS_PATH = '/api/bookings';
export const SLOT_TAKEN = 'That time was just taken. Pick another.';

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]+$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown) => (typeof v === 'string' && !CONTROL.test(v) ? v.trim() : '');

/** The widget's request, re-checked on the host; an error line for the widget otherwise. */
export function toBookingRequest(v: unknown): BookingRequest | { error: string } {
	if (!isRecord(v)) return { error: 'That booking could not be read. Try again.' };
	const service_id = typeof v.service_id === 'string' && ID.test(v.service_id) ? v.service_id : '';
	const start = typeof v.start === 'string' && ISO.test(v.start) ? v.start : '';
	if (!service_id || !start) return { error: 'Pick a time first.' };
	if (v.party !== undefined && !(Number.isInteger(v.party) && (v.party as number) >= 1 && (v.party as number) <= 50))
		return { error: 'Choose how many people are coming.' };
	const c = isRecord(v.customer) ? v.customer : {};
	const name = text(c.name);
	const email = text(c.email);
	const phone = text(c.phone);
	if (!name || name.length > 80) return { error: 'Add the name for the booking (80 characters at most).' };
	if (email && (email.length > 254 || !EMAIL.test(email))) return { error: 'That email looks incomplete.' };
	const digits = phone.replace(/\D/g, '').length;
	if (phone && (phone.length > 24 || !PHONE.test(phone) || digits < 7 || digits > 15)) return { error: 'That phone number looks incomplete.' };
	if (!email && !phone) return { error: 'Add an email or a phone number.' };
	const notes = typeof v.notes === 'string' ? v.notes.trim() : '';
	if (notes.length > 500) return { error: 'Notes can be up to 500 characters.' };
	return {
		service_id,
		start,
		...(v.party !== undefined && { party: v.party as number }),
		customer: { name, ...(email && { email }), ...(phone && { phone }) },
		...(notes && { notes })
	};
}

export type Booked = Confirmed & { start: string };
export type BookResult = { ok: true; booking: Booked } | { ok: false; notice: Notice; reload?: boolean };

export interface BookDeps {
	storeUrl: string;
	fetch?: typeof fetch;
}

const base = (url: string) => url.replace(/\/$/, '');
const calm = (text: string): BookResult => ({ ok: false, notice: { kind: 'error', text } });

export async function book(request: BookingRequest, deps: BookDeps): Promise<BookResult> {
	let res: Response;
	try {
		res = await (deps.fetch ?? fetch)(`${base(deps.storeUrl)}${BOOKINGS_PATH}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(request)
		});
	} catch {
		return calm("Can't reach the restaurant right now. Check your connection and try again.");
	}
	const data: unknown = await res.json().catch(() => null);
	const d = isRecord(data) ? data : {};
	if (res.status === 201) {
		const booking_id = typeof d.booking_id === 'string' && ID.test(d.booking_id) ? d.booking_id : '';
		if (!booking_id) return calm('The restaurant answered in a way this page could not read. Check with them before you go.');
		return {
			ok: true,
			booking: {
				booking_id,
				start: typeof d.start === 'string' && ISO.test(d.start) ? d.start : request.start,
				label: text(d.label) || undefined,
				date_label: text(d.date_label) || undefined,
				service_name: text(d.service_name) || undefined,
				party: Number.isInteger(d.party) ? (d.party as number) : request.party
			}
		};
	}
	if (res.status === 409) return { ok: false, notice: { kind: 'error', text: SLOT_TAKEN, code: 'slot_taken', start: request.start } };
	if (res.status === 429) return calm('Lots of bookings from here just now. Wait a minute, then try again.');
	if (res.status === 400) {
		const message = text(d.message).slice(0, 200);
		return {
			ok: false,
			notice: { kind: 'error', text: message ? `The restaurant could not take that booking: ${message}.` : 'The restaurant could not take that booking.' },
			reload: /\b(start|date)\b/i.test(message)
		};
	}
	return calm("The restaurant can't take bookings right now. Try again shortly.");
}

/** Fresh slots for the days the card already shows; null when any day fails (keep the old ones). */
export async function reloadDays(days: readonly Day[], serviceId: string, party: number | undefined, deps: BookDeps): Promise<Day[] | null> {
	try {
		return await Promise.all(
			days.map(async (day) => {
				if (!DATE.test(day.date)) throw new Error('bad date');
				const q = new URLSearchParams({ service: serviceId, date: day.date, ...(party ? { party: String(party) } : {}) });
				const res = await (deps.fetch ?? fetch)(`${base(deps.storeUrl)}/api/booking/slots?${q}`);
				const d: unknown = await res.json();
				if (!res.ok || !isRecord(d) || !Array.isArray(d.slots)) throw new Error('bad slots');
				return { date: day.date, date_label: text(d.date_label) || day.date_label, slots: d.slots as Day['slots'] };
			})
		);
	} catch {
		return null;
	}
}

type Node = Record<string, unknown> & { props: Record<string, unknown> };

/** The card's booking nodes, in tree order. */
function bookingNodes(root: unknown): Node[] {
	const out: Node[] = [];
	const stack = [root];
	while (stack.length) {
		const v = stack.pop();
		if (Array.isArray(v)) stack.push(...v.toReversed());
		else if (isRecord(v)) {
			if (v.type === 'booking' && isRecord(v.props)) out.push(v as Node);
			stack.push(...Object.values(v).toReversed());
		}
	}
	return out;
}

/** The booking node that offers `serviceId` (else the first): its props, for reading. */
export function bookingProps(spec: unknown, serviceId: string): Record<string, unknown> | undefined {
	const nodes = bookingNodes(isRecord(spec) ? spec.ui : undefined);
	const offers = (n: Node) => Array.isArray(n.props.services) && n.props.services.some((s) => isRecord(s) && s.id === serviceId);
	return (nodes.find(offers) ?? nodes[0])?.props;
}

/** A copy of the spec with `patch` merged into that booking node's props; null without one. */
export function patchBooking(spec: Record<string, unknown>, serviceId: string, patch: Record<string, unknown>): Record<string, unknown> | null {
	const next = structuredClone(spec);
	const props = bookingProps(next, serviceId);
	if (!props) return null;
	Object.assign(props, patch);
	return next;
}

const icsText = (v: string) => v.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\r?\n/g, '\\n');
const icsTime = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** An iCalendar file for the booking, times in UTC; '' when the start can't be read. */
export function bookingIcs(b: Booked, opts: { durationMin?: number; place?: string; now?: number } = {}): string {
	const start = Date.parse(b.start);
	if (!ISO.test(b.start) || Number.isNaN(start)) return '';
	const minutes = opts.durationMin && opts.durationMin > 0 ? opts.durationMin : 90;
	const what = b.service_name ?? 'Booking';
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Ripple//Booking//EN',
		'BEGIN:VEVENT',
		`UID:${b.booking_id}@ripple.pocketpaw.xyz`,
		`DTSTAMP:${icsTime(opts.now ?? Date.now())}`,
		`DTSTART:${icsTime(start)}`,
		`DTEND:${icsTime(start + minutes * 60_000)}`,
		`SUMMARY:${icsText(b.party ? `${what}, party of ${b.party}` : what)}`,
		`DESCRIPTION:${icsText(`Booking ${b.booking_id}`)}`,
		...(opts.place ? [`LOCATION:${icsText(opts.place)}`] : []),
		'END:VEVENT',
		'END:VCALENDAR'
	];
	return lines.join('\r\n') + '\r\n';
}
