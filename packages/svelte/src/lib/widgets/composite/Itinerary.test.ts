// widgets/composite/Itinerary.test.ts — the itinerary data widget: registry and
// bind-contract wiring, a bound tick and add writing a NEW days array back to
// state, streamed parity with id-less and field-less items, junk props, and
// its own logic (spend vs budget, time-ordered insert, route from legs,
// duplicate keys, the next-stop marker, one open day at a time).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget, hasWidget } from '../index.js';
import { _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import Itinerary, { budgetStatus, clockMinutes, duration, insertByTime, type ItineraryDay } from './Itinerary.svelte';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const tokyo = (): ItineraryDay[] => [
	{
		id: 'd1',
		label: 'Day 1',
		when: 'Fri 16 Oct',
		theme: 'Old Tokyo',
		stay: 'Hotel Kinsei, Asakusa',
		stops: [
			{ id: 's1', time: '08:00', title: 'Senso-ji at dawn', kind: 'sight', place: 'Asakusa', minutes: 60, cost: 0, must: true },
			{ id: 's2', time: '12:30', title: 'Soba lunch', kind: 'food', cost: 18 },
			{ id: 's3', time: '16:00', title: 'Sumida river cruise', kind: 'activity', minutes: 40, cost: 12 }
		]
	},
	{ id: 'd2', label: 'Day 2', theme: 'Shibuya', stops: [{ id: 's4', time: '10:00', title: 'Meiji shrine', kind: 'sight', cost: 0 }] }
];

describe('itinerary: registry and bind contract', () => {
	it('resolves the type and both aliases to one component', () => {
		for (const t of ['itinerary', 'trip-plan', 'travel-itinerary']) expect(hasWidget(t)).toBe(true);
		expect(getWidget('trip-plan')).toBe(getWidget('itinerary'));
		expect(getWidget('travel-itinerary')).toBe(getWidget('itinerary'));
	});

	it('binds days through ondayschange, for every alias, without the unregistered warning', () => {
		expect(getBindContract('itinerary')).toEqual({ prop: 'days', event: 'ondayschange' });
		expect(getBindContract('trip-plan')).toEqual(getBindContract('itinerary'));
		expect(getBindContract('travel-itinerary')).toEqual(getBindContract('itinerary'));
		_resetBindContractWarnings();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		warnUnregisteredBindContract('itinerary');
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('itinerary: bound edits', () => {
	const mountBound = () => {
		const initial = tokyo();
		const onStateChange = vi.fn();
		render(Ripple, {
			props: { spec: { state: { days: initial }, ui: { type: 'itinerary', bind: '{state.days}', props: { budget: 500 } } }, onStateChange }
		});
		return { initial, onStateChange };
	};
	const lastDays = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)![1] as ItineraryDay[];

	it.each([
		['without', { budget: 500 }],
		['with', { budget: 500, open: 0 }]
	])('the open day survives a tick that re-sends the spec %s `open` in it', async (_, props) => {
		const { container } = render(Ripple, { props: { spec: { state: { days: tokyo() }, ui: { type: 'itinerary', bind: '{state.days}', props } } } });
		await fireEvent.click(container.querySelectorAll('[aria-expanded]')[1]);
		await fireEvent.click(screen.getByRole('checkbox', { name: 'Meiji shrine' }));
		expect(container.querySelectorAll('[aria-expanded]')[1].getAttribute('aria-expanded')).toBe('true');
		expect(screen.getByRole('checkbox', { name: 'Meiji shrine' }).getAttribute('aria-checked')).toBe('true');
	});

	it('ticking a stop writes a new days array with that stop done', async () => {
		const { initial, onStateChange } = mountBound();
		const box = screen.getByRole('checkbox', { name: 'Soba lunch' });
		expect(box.getAttribute('aria-checked')).toBe('false');
		await fireEvent.click(box);

		expect(onStateChange).toHaveBeenLastCalledWith('days', expect.any(Array), expect.anything());
		const next = lastDays(onStateChange);
		expect(next).not.toBe(initial);
		expect(next[0].stops![1]).toMatchObject({ id: 's2', done: true });
		expect(next[0].stops![0]).not.toHaveProperty('done');
		expect(initial[0].stops![1]).not.toHaveProperty('done');
		expect(screen.getByRole('checkbox', { name: 'Soba lunch' }).getAttribute('aria-checked')).toBe('true');

		await fireEvent.click(screen.getByRole('checkbox', { name: 'Soba lunch' }));
		expect(lastDays(onStateChange)[0].stops![1].done).toBe(false);
	});

	it('adding a stop inserts it by time and writes it back', async () => {
		const { onStateChange } = mountBound();
		await fireEvent.click(screen.getByRole('button', { name: 'Add a stop' }));
		await fireEvent.input(screen.getByRole('textbox', { name: 'Stop' }), { target: { value: 'Coffee at Fuglen' } });
		await fireEvent.input(screen.getByLabelText('Time'), { target: { value: '14:00' } });
		await fireEvent.input(screen.getByRole('spinbutton', { name: 'Cost in USD' }), { target: { value: '6' } });
		await fireEvent.submit(screen.getByRole('form', { name: /Add a stop/ }));

		const titles = lastDays(onStateChange)[0].stops!.map((s) => s.title);
		expect(titles).toEqual(['Senso-ji at dawn', 'Soba lunch', 'Coffee at Fuglen', 'Sumida river cruise']);
		expect(lastDays(onStateChange)[0].stops![2]).toMatchObject({ time: '14:00', cost: 6, kind: 'activity' });
		expect(screen.getByRole('checkbox', { name: 'Coffee at Fuglen' })).toBeTruthy();
	});

	it('ignores an add with no title', async () => {
		const { onStateChange } = mountBound();
		await fireEvent.click(screen.getByRole('button', { name: 'Add a stop' }));
		await fireEvent.submit(screen.getByRole('form', { name: /Add a stop/ }));
		expect(onStateChange).not.toHaveBeenCalled();
	});

	it('a Svelte parent bound to days sees the new array', async () => {
		let got: unknown;
		render(Itinerary, { props: { days: tokyo(), ondayschange: (d: unknown) => (got = d) } });
		await fireEvent.click(screen.getByRole('checkbox', { name: 'Senso-ji at dawn' }));
		expect((got as ItineraryDay[])[0].stops![0].done).toBe(true);
	});
});

describe('itinerary: streaming', () => {
	it('streams with id-less and field-less items and ends equal to the whole render', async () => {
		await expectStreamParity({
			ui: {
				type: 'itinerary',
				props: {
					title: '5 days in Tokyo',
					verdict: { text: 'Planned spend sits just under budget; Day 3 is the heavy one.', status: 'warn' },
					budget: 1400,
					route: ['San Francisco', 'Tokyo', 'Hakone', 'Tokyo'],
					legs: [
						{ from: 'San Francisco', to: 'Tokyo', kind: 'flight', ref: 'Kite Air 12', minutes: 660, cost: 820 },
						{ from: 'Tokyo', to: 'Hakone', kind: 'train', minutes: 85, cost: 22 },
						{}
					],
					days: [
						{ label: 'Day 1', stops: [{ time: '08:00', title: 'Senso-ji', kind: 'sight', cost: 0 }, {}, { title: 'Soba', cost: 18 }] },
						{},
						{ label: 'Day 3', stops: [{ title: 'Senso-ji', kind: 'sight' }, { title: 'Senso-ji', kind: 'sight' }] }
					],
					packing: [{ group: 'Rail', items: ['IC card'] }, {}]
				}
			}
		});
	});
});

describe('itinerary: junk props', () => {
	it.each([
		['wrong types everywhere', { days: 'soon', legs: 5, packing: { a: 1 }, route: null, budget: 'lots', open: 'x', currency: '$$' }],
		['junk rows', { days: [null, 7, 'Day', { stops: 'none' }, { stops: [null, 3, 'Lunch', { title: { x: 1 } }, { title: 'Ok', cost: 'NaN', minutes: -5 }] }] }],
		['junk legs and packing', { legs: [null, { from: 3 }, { to: 'Kyoto' }], packing: [null, { items: 'socks, charger' }, { group: 'Kit', items: [1, null] }] }],
		['nothing at all', {}]
	])('%s renders without throwing', (_name, props) => {
		const { container } = render(Itinerary, { props: props as never });
		expect(container.querySelector('[data-widget="itinerary"]')).not.toBeNull();
	});

	it('shows the empty line when there are no days', () => {
		render(Itinerary, { props: {} });
		expect(screen.getByText('No stops yet. Ask for a day plan.')).toBeTruthy();
	});

	it('reads packing items written as one comma string', () => {
		render(Itinerary, { props: { packing: [{ group: 'Bag', items: 'socks, charger' }] as never } });
		expect(screen.getByText('socks')).toBeTruthy();
		expect(screen.getByText('charger')).toBeTruthy();
	});
});

describe('itinerary: logic', () => {
	it('helpers: clock minutes, duration, budget status', () => {
		expect(clockMinutes('08:30')).toBe(510);
		expect(clockMinutes('Morning')).toBeUndefined();
		expect(clockMinutes(undefined)).toBeUndefined();
		expect([duration(90), duration(45), duration(120), duration(0), duration(undefined)]).toEqual(['1h 30m', '45m', '2h', '', '']);
		expect([budgetStatus(800, 1000), budgetStatus(950, 1000), budgetStatus(1001, 1000), budgetStatus(10, undefined)]).toEqual([
			'good',
			'warn',
			'bad',
			'neutral'
		]);
	});

	it('insertByTime places by HH:MM and appends untimed stops', () => {
		const stops = [{ time: '08:00' }, { time: 'Lunch' }, { time: '16:00' }];
		expect(insertByTime(stops, { title: 'a', time: '09:00' }).map((s) => s.time)).toEqual(['08:00', 'Lunch', '09:00', '16:00']);
		expect(insertByTime(stops, { title: 'b', time: '07:00' })[0]).toMatchObject({ title: 'b' });
		expect(insertByTime(stops, { title: 'c' }).at(-1)).toMatchObject({ title: 'c' });
		expect(insertByTime(stops, { title: 'd', time: '23:00' }).at(-1)).toMatchObject({ title: 'd' });
	});

	it('plans stop and leg costs against the budget and flags it', async () => {
		const legs = [{ from: 'A', to: 'B', kind: 'train' as const, cost: 100 }];
		const { container, rerender } = render(Itinerary, { props: { days: tokyo(), legs, budget: 200, currency: 'USD' } });
		const spend = () => container.querySelector('[data-slot="spend"]')!;
		// 0 + 18 + 12 + 0 stops, 100 leg = 130 of 200: good
		expect(spend().textContent).toContain('$130.00');
		expect(spend().getAttribute('data-status')).toBe('good');
		await rerender({ budget: 140 });
		expect(spend().getAttribute('data-status')).toBe('warn');
		await rerender({ budget: 100 });
		expect(spend().getAttribute('data-status')).toBe('bad');
		expect(spend().textContent).toContain('Over by $30.00');
	});

	it('derives the route from legs and draws a leg icon between cities', () => {
		const { container } = render(Itinerary, {
			props: { legs: [{ from: 'Lisbon', to: 'Sintra', kind: 'train' }, { from: 'Sintra', to: 'Cascais', kind: 'bus' }] }
		});
		const route = container.querySelector('[data-slot="route"]')!;
		expect([...route.querySelectorAll('li')].map((li) => li.textContent?.trim().split(/\s/)[0])).toEqual(['Lisbon', 'Sintra', 'Cascais']);
		expect([...route.querySelectorAll('[data-leg]')].map((el) => el.getAttribute('data-leg'))).toEqual(['train', 'bus']);
	});

	it('survives duplicate ids and titles, and edits the right one', async () => {
		let got: ItineraryDay[] = [];
		const days = [{ id: 'x', stops: [{ id: 'a', title: 'Ramen' }, { id: 'a', title: 'Ramen' }] }, { id: 'x', stops: [] }];
		render(Itinerary, { props: { days, ondayschange: (d: unknown) => (got = d as typeof got) } });
		const boxes = screen.getAllByRole('checkbox', { name: 'Ramen' });
		expect(boxes).toHaveLength(2);
		await fireEvent.click(boxes[1]);
		expect(got[0].stops!.map((s) => s.done)).toEqual([undefined, true]);
	});

	it('marks the first unticked stop as next and opens one day at a time', async () => {
		const days = tokyo();
		days[0].stops![0] = { ...days[0].stops![0], done: true };
		const { container } = render(Itinerary, { props: { days } });
		expect(container.querySelector('[data-next]')?.textContent).toContain('Soba lunch');

		const [day1, day2] = container.querySelectorAll('[aria-expanded]');
		expect(day1.getAttribute('aria-expanded')).toBe('true');
		await fireEvent.click(day2);
		await tick();
		expect(day1.getAttribute('aria-expanded')).toBe('false');
		expect(day2.getAttribute('aria-expanded')).toBe('true');
		expect(screen.getByRole('checkbox', { name: 'Meiji shrine' })).toBeTruthy();
		expect(screen.queryByRole('checkbox', { name: 'Soba lunch' })).toBeNull();
	});

	it('never renders a refused stop image', () => {
		const { container } = render(Itinerary, {
			props: { days: [{ stops: [{ title: 'Pier', image: 'javascript:alert(1)' }, { title: 'Park', image: '/photos/park.webp' }] }] }
		});
		expect([...container.querySelectorAll('img')].map((i) => i.getAttribute('src'))).toEqual(['/photos/park.webp']);
	});

	it('shows times as written and the must-see tag', () => {
		render(Itinerary, { props: { days: [{ label: 'Day 1', stops: [{ time: 'Late morning', title: 'Tsukiji market', kind: 'food', must: true }] }] } });
		expect(screen.getByText('Late morning')).toBeTruthy();
		expect(screen.getByText('Must see')).toBeTruthy();
	});
});
