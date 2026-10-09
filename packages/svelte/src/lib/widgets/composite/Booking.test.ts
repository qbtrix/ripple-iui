// widgets/composite/Booking.test.ts — the `booking` widget: its data rules
// (./booking.ts: nearest slot, store data readers, details checks, the emitted
// request), registry and bind wiring, the stage flow end to end (pre-selected
// slot, Full slots, details, Book, the host's slot-taken and confirmed
// answers), a streamed mount, and junk props.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { getBindContract } from '@ripple-ui/core';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget } from '../index.js';
import Booking from './Booking.svelte';
import { checkDetails, clock, isSlotTaken, nearest, partsOfDay, readDays, toRequest, type Service } from './booking.js';

afterEach(cleanup);

const TIMES = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
const label = (t: string) => {
	const [h, m] = t.split(':').map(Number);
	return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const day = (date: string, date_label: string, full: string[] = []) => ({
	date,
	date_label,
	slots: TIMES.map((t) => ({ start: `${date}T${t}:00-04:00`, label: label(t), available: !full.includes(t) }))
});
const DAYS = [
	day('2026-10-15', 'Thu 15 Oct'),
	day('2026-10-16', 'Fri 16 Oct', ['18:30', '19:00']),
	day('2026-10-17', 'Sat 17 Oct', TIMES),
	day('2026-10-18', 'Sun 18 Oct'),
	{ date: '2026-10-19', date_label: 'Mon 19 Oct', slots: [] },
	day('2026-10-20', 'Tue 20 Oct'),
	day('2026-10-21', 'Wed 21 Oct'),
	day('2026-10-22', 'Thu 22 Oct')
];
const TABLE = { id: 'table', name: 'Dinner table', kind: 'table', duration_min: 90, party: { min: 1, max: 8 } };
const PROPS = {
	subtitle: 'Juniper & Ash',
	tz: 'America/New_York',
	party: 4,
	preferred: { date: '2026-10-16', after: '19:00' },
	services: [TABLE],
	days: DAYS
};
const FRI = (t: string) => `2026-10-16T${t}:00-04:00`;
const btn = (name: string | RegExp) => screen.getByRole('button', { name });

describe('booking data rules', () => {
	const days = readDays(DAYS);
	const none = new Set<string>();

	it('pre-selects the open slot nearest the ask, a tie going to the later one', () => {
		// 19:00 and 18:30 are full on Friday; 19:30 and 18:00 are equally far.
		expect(nearest(days, { date: '2026-10-16', after: '19:00' }, none)).toEqual({ date: '2026-10-16', start: FRI('19:30') });
		expect(nearest(days, { date: '2026-10-16', after: '17:40' }, none)?.start).toBe(FRI('17:30'));
	});

	it('skips taken slots and full days, and stops past the last day', () => {
		const gone = new Set([FRI('19:30'), FRI('20:00'), FRI('20:30')]);
		expect(nearest(days, { date: '2026-10-16', after: '19:00' }, gone)?.start).toBe(FRI('18:00'));
		expect(nearest(days, { date: '2026-10-17', after: '19:00' }, none)?.date).toBe('2026-10-18');
		expect(nearest(days, { date: '2026-11-30' }, none)).toBeUndefined();
		expect(nearest(days, undefined, none)).toBeUndefined();
	});

	it('reads clock times from the string, never through Date', () => {
		const parse = vi.spyOn(Date, 'parse');
		expect(clock('2026-10-16T19:30:00-04:00')).toBe(1170);
		expect(clock('19:05')).toBe(1145);
		expect(clock('2026-10-1')).toBeUndefined();
		expect(nearest(days, { date: '2026-10-15', after: '18:00' }, none)?.start).toBe('2026-10-15T18:00:00-04:00');
		expect(parse).not.toHaveBeenCalled();
		parse.mockRestore();
	});

	it('reads store days: date_label, the doc\'s label, half-streamed slots', () => {
		const read = readDays([
			{ date: '2026-10-16', label: 'Fri 16 Oct', slots: [{ start: FRI('19:00'), label: '7:00 PM' }, { label: 'x' }, 'junk'] },
			{ slots: 'nope' }
		]);
		expect(read[0]).toEqual({ date: '2026-10-16', date_label: 'Fri 16 Oct', slots: [{ start: FRI('19:00'), label: '7:00 PM', available: false }] });
		expect(read[1].slots).toEqual([]);
	});

	it('groups slots by part of the day', () => {
		const groups = partsOfDay(readDays([day('2026-10-16', 'Fri', [])])[0].slots.slice(0, 1).concat({ start: FRI('11:30'), label: '11:30 AM', available: true }));
		expect(groups.map((g) => g.name)).toEqual(['Evening', 'Morning']);
	});

	it('checks details the way the host does', () => {
		expect(checkDetails({ customer: { name: '' } })).toEqual({ name: expect.any(String), contact: expect.any(String) });
		expect(checkDetails({ customer: { name: 'Ana', email: 'ana@' } }).email).toBeTruthy();
		expect(checkDetails({ customer: { name: 'Ana', phone: '12' } }).phone).toBeTruthy();
		expect(checkDetails({ customer: { name: 'x'.repeat(81), phone: '+1 202 555 0143' } })).toEqual({ name: expect.any(String) });
		expect(checkDetails({ customer: { name: 'Ana', phone: '+1 202 555 0143' }, notes: 'x'.repeat(501) })).toEqual({ notes: expect.any(String) });
		expect(checkDetails({ customer: { name: 'Ana', email: 'ana@example.com' } })).toEqual({});
	});

	it('builds the store request: trimmed, empty optionals left out, party only with bounds', () => {
		const sel = { start: FRI('19:30'), party: 4, customer: { name: ' Ana Ruiz ', email: '', phone: '+1 202 555 0143' }, notes: '  ' };
		expect(toRequest(sel, TABLE as Service)).toEqual({
			service_id: 'table',
			start: FRI('19:30'),
			party: 4,
			customer: { name: 'Ana Ruiz', phone: '+1 202 555 0143' }
		});
		expect(toRequest(sel, { id: 'cut', name: 'Haircut' })).not.toHaveProperty('party');
		expect(toRequest({ ...sel, party: 9 }, TABLE as Service)).toBeUndefined();
		expect(toRequest({ ...sel, start: undefined }, TABLE as Service)).toBeUndefined();
	});

	it('knows a slot-taken notice by code, or by text without a code', () => {
		expect(isSlotTaken({ kind: 'error', text: 'Sorry', code: 'slot_taken' })).toBe(true);
		expect(isSlotTaken({ kind: 'error', text: 'That time was just taken. Pick another.' })).toBe(true);
		expect(isSlotTaken({ kind: 'error', text: 'Too many requests', code: 'rate_limited' })).toBe(false);
		expect(isSlotTaken({ kind: 'info', text: 'taken' })).toBe(false);
	});
});

describe('booking registry and bind', () => {
	it('registers booking and its aliases', () => {
		for (const t of ['booking', 'reservation', 'appointment']) {
			expect(getWidget(t)).toBe(Booking);
			expect(getBindContract(t)).toEqual({ prop: 'selection', event: 'onselectionchange' });
		}
	});

	it('a bound selection drives the widget and every edit writes a new value back', async () => {
		const onStateChange = vi.fn();
		render(Ripple, {
			props: {
				spec: { state: { booking: { party: 6 } }, ui: { type: 'booking', bind: '{state.booking}', props: PROPS } },
				onStateChange
			}
		});
		expect(screen.getByRole('group', { name: 'Guests' }).textContent).toContain('6');
		await fireEvent.click(btn('More guests'));
		expect(onStateChange).toHaveBeenLastCalledWith('booking', expect.objectContaining({ party: 7, service_id: 'table' }), expect.anything());
		expect(screen.getByRole('group', { name: 'Guests' }).textContent).toContain('7');
		await fireEvent.click(btn('Choose a time'));
		await fireEvent.click(btn('8:00 PM'));
		expect(onStateChange).toHaveBeenLastCalledWith('booking', expect.objectContaining({ start: FRI('20:00') }), expect.anything());
	});
});

describe('booking through Ripple', () => {
	it('on_book reaches the host as the emitted request', async () => {
		const onEvent = vi.fn();
		render(Ripple, {
			props: {
				spec: {
					state: { booking: { customer: { name: 'Ana Ruiz', phone: '+1 202 555 0143' } } },
					ui: { type: 'booking', bind: '{state.booking}', props: PROPS, on_book: { action: 'emit', target: 'book' } }
				},
				onEvent
			}
		});
		await fireEvent.click(btn('Choose a time'));
		await fireEvent.click(btn('Add your details'));
		await fireEvent.click(btn('Review'));
		await fireEvent.click(btn('Book table'));
		await vi.waitFor(() => expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'emit' })));
		const emit = onEvent.mock.calls.map(([e]) => e).find((e) => e?.type === 'emit');
		expect(emit.payload).toEqual({
			service_id: 'table',
			start: FRI('19:30'),
			party: 4,
			customer: { name: 'Ana Ruiz', phone: '+1 202 555 0143' }
		});
	});
});

describe('booking flow', () => {
	async function toReview(onbook = vi.fn()) {
		const r = render(Booking, { props: { ...PROPS, onbook } });
		await fireEvent.click(btn('Choose a time'));
		await fireEvent.click(btn('Add your details'));
		await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Ana Ruiz' } });
		await fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
		await fireEvent.click(btn('Review'));
		return { ...r, onbook };
	}

	it('opens on guests with the asked party, then the time stage on the asked day', async () => {
		render(Booking, { props: PROPS });
		expect(screen.getByRole('heading', { name: 'Book a table' })).toBeTruthy();
		expect(screen.getByRole('group', { name: 'Guests' }).textContent).toContain('4');
		await fireEvent.click(btn('Choose a time'));
		expect(btn(/^Fri 16 Oct/).getAttribute('aria-pressed')).toBe('true');
		expect(btn('Sat 17 Oct, full')).toBeTruthy();
		expect(btn('Mon 19 Oct, closed')).toBeTruthy();
		// The nearest open slot to 19:00 is pre-selected and says why.
		expect(btn('7:30 PM, closest to your ask').getAttribute('aria-pressed')).toBe('true');
		// Full slots stay visible, disabled, and say Full in words.
		const full = btn('7:00 PM, full') as HTMLButtonElement;
		expect(full.disabled).toBe(true);
		expect(full.textContent).toContain('Full');
		expect(screen.getByText('Times are New York time.')).toBeTruthy();
	});

	it('pages a second week and clears the time when the day changes', async () => {
		render(Booking, { props: PROPS });
		await fireEvent.click(btn('Choose a time'));
		expect(screen.queryByRole('button', { name: /Thu 22 Oct/ })).toBeNull();
		await fireEvent.click(btn('Later week'));
		expect(btn(/^Thu 22 Oct/).getAttribute('aria-pressed')).toBe('true');
		expect((btn('Add your details') as HTMLButtonElement).disabled).toBe(true);
		await fireEvent.click(btn('6:00 PM'));
		expect((btn('Add your details') as HTMLButtonElement).disabled).toBe(false);
	});

	it('holds details until a name and a way to reach them are given', async () => {
		render(Booking, { props: PROPS });
		await fireEvent.click(btn('Choose a time'));
		await fireEvent.click(btn('Add your details'));
		await fireEvent.click(btn('Review'));
		expect(screen.getByText('Add the name for the booking.')).toBeTruthy();
		expect(screen.getByText('Add an email or a phone number.')).toBeTruthy();
		expect(screen.getByLabelText('Name').getAttribute('aria-invalid')).toBe('true');
	});

	it('books once with the store request, then shows the confirmation and no actions', async () => {
		const { onbook, rerender } = await toReview();
		expect(screen.getByText('Ana Ruiz')).toBeTruthy();
		await fireEvent.click(btn('Book table'));
		await fireEvent.click(btn('Booking…'));
		expect(onbook).toHaveBeenCalledTimes(1);
		expect(onbook).toHaveBeenCalledWith({
			service_id: 'table',
			start: FRI('19:30'),
			party: 4,
			customer: { name: 'Ana Ruiz', email: 'ana@example.com' }
		});
		await rerender({
			confirmed: { booking_id: 'JA-2041', label: '7:30 PM', date_label: 'Fri 16 Oct', service_name: 'Dinner table', party: 4 }
		});
		expect(screen.getByText("You're booked")).toBeTruthy();
		expect(screen.getByText('JA-2041')).toBeTruthy();
		expect(screen.getByText('4 guests')).toBeTruthy();
		expect(screen.queryAllByRole('button')).toEqual([]);
	});

	it('a slot-taken answer returns to the times with that slot Full and the next nearest picked', async () => {
		const { rerender, onbook } = await toReview();
		await fireEvent.click(btn('Book table'));
		await rerender({ notice: { kind: 'error', text: 'That time was just taken. Pick another.' } });
		await tick();
		expect(screen.getByRole('alert').textContent).toContain('just taken');
		const gone = btn('7:30 PM, full') as HTMLButtonElement;
		expect(gone.disabled).toBe(true);
		expect(btn('8:00 PM, closest to your ask').getAttribute('aria-pressed')).toBe('true');
		// Details survive; the visitor goes straight back to review and books again.
		await fireEvent.click(btn('Add your details'));
		expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ana Ruiz');
		await fireEvent.click(btn('Review'));
		await fireEvent.click(btn('Book table'));
		expect(onbook).toHaveBeenLastCalledWith(expect.objectContaining({ start: FRI('20:00') }));
	});

	it('any other error stays on review, re-enables Book, and marks no slot Full', async () => {
		const { rerender } = await toReview();
		await fireEvent.click(btn('Book table'));
		await rerender({ notice: { kind: 'error', text: 'Too many tries. Wait a minute.', code: 'rate_limited' } });
		await tick();
		expect(screen.getByRole('alert').textContent).toContain('Too many tries');
		expect((btn('Book table') as HTMLButtonElement).disabled).toBe(false);
	});

	it('keeps Book off without a host handler', async () => {
		render(Booking, { props: { ...PROPS, selection: { customer: { name: 'Ana', phone: '+1 202 555 0143' } } } });
		await fireEvent.click(btn('Choose a time'));
		await fireEvent.click(btn('Add your details'));
		await fireEvent.click(btn('Review'));
		expect((btn('Book table') as HTMLButtonElement).disabled).toBe(true);
	});

	it('lists services with a choice when there are several', async () => {
		const services = [
			{ id: 'cut', name: 'Haircut', kind: 'hair', duration_min: 45, price: 38 },
			{ name: 'Half-streamed' },
			{ id: 'color', name: 'Colour', kind: 'beauty', duration_min: 120, price: 140 }
		];
		render(Booking, { props: { services, days: DAYS } });
		expect(screen.getByRole('heading', { name: 'Book an appointment' })).toBeTruthy();
		expect((btn('Choose a time') as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByRole('radio', { name: /Half-streamed/ }) as HTMLButtonElement).disabled).toBe(true);
		await fireEvent.click(screen.getByRole('radio', { name: /Colour/ }));
		expect(screen.getByText('$140.00')).toBeTruthy();
		expect(screen.queryByRole('group', { name: 'Guests' })).toBeNull();
		expect((btn('Choose a time') as HTMLButtonElement).disabled).toBe(false);
	});
});

describe('booking streamed and junk', () => {
	it('streams to the same render as a whole mount, with id-less and half items', async () => {
		await expectStreamParity({
			ui: {
				type: 'booking',
				props: {
					subtitle: 'Juniper & Ash',
					verdict: { text: 'Friday is busy after 6:30; 7:30 is the closest open table.', status: 'info' },
					party: 4,
					preferred: { date: '2026-10-16', after: '19:00' },
					services: [TABLE, { name: 'Patio' }],
					days: [DAYS[0], DAYS[1], { date_label: 'Sat 17 Oct', slots: [{ label: '6:00 PM' }] }]
				}
			}
		});
	});

	it.each([
		['missing arrays', {}],
		['wrong types', { services: 'x', days: {}, notice: 'oops', confirmed: 42, preferred: 5, party: 'many', selection: 7, tz: 3 }],
		['nulls inside', { services: [null, 1, { id: 2 }], days: [null, { slots: [null] }], confirmed: { booking_id: '' } }]
	])('renders with %s', (_, props) => {
		render(Booking, { props: props as Record<string, unknown> });
		expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
	});

	it('shows a skeleton while server data is missing and says so when it is empty', async () => {
		const { container, rerender } = render(Booking, { props: { party: 2 } });
		expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
		await rerender({ services: [] });
		expect(screen.getByText('Nothing to book here right now.')).toBeTruthy();
	});
});
