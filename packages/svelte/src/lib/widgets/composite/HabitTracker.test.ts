// widgets/composite/HabitTracker.test.ts: the habit-tracker data widget on a
// fixed local clock (Wednesday 14 October 2026): the date and streak maths in
// habit-tracker.ts, registry and bind-contract wiring, ticking and unticking,
// targets met, week_start, week paging, add / rename / remove, the keyboard
// grid, a re-sent spec keeping the ticks, streamed parity and junk props.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { manifestEntries } from '$lib/manifest/index.js';
import { getWidget, hasWidget } from '../index.js';
import { _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import HabitTracker from './HabitTracker.svelte';
import {
	addDays,
	currentStreak,
	dayLong,
	longestStreak,
	nextHabitId,
	onTrack,
	readHabits,
	readTicks,
	seedTicks,
	toggleTick,
	weekDays,
	weekRange,
	weekStartOf,
	type HabitValue
} from './habit-tracker.js';

const TODAY = '2026-10-14'; // a Wednesday

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date(2026, 9, 14, 10, 30));
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const TYPES = ['habit-tracker', 'habits', 'streak-tracker'];
const HABITS = () => [
	{ id: 'read', name: 'Read', icon: 'read', target_per_week: 5 },
	{ id: 'run', name: 'Run', icon: 'run', target_per_week: 2 }
];
const cell = (name: string | RegExp) => screen.getByRole('button', { name });
const pressed = (name: string | RegExp) => cell(name).getAttribute('aria-pressed');
const lastValue = (fn: ReturnType<typeof vi.fn>) => fn.mock.lastCall?.[0] as HabitValue;
const first = (c: Element) => c.querySelector('[data-habit="read"] [data-cell="0:0"]')?.getAttribute('aria-label');
const spec = (habits = HABITS()) => ({ state: {}, ui: { type: 'habit-tracker', bind: '{state.habits}', props: { habits, seed: { read: [1] } } } });
const ui = (habits = HABITS()) => ({ ui: { type: 'habit-tracker', props: { habits } } });

describe('habit-tracker: dates and streaks', () => {
	it('starts a week on Monday or Sunday, from any day', () => {
		expect(weekStartOf(TODAY, 'mon')).toBe('2026-10-12');
		expect(weekStartOf(TODAY, 'sun')).toBe('2026-10-11');
		// Sunday 18 October ends a Monday week and starts a Sunday one.
		expect(weekStartOf('2026-10-18', 'mon')).toBe('2026-10-12');
		expect(weekStartOf('2026-10-18', 'sun')).toBe('2026-10-18');
		expect(weekStartOf('2026-10-12', 'mon')).toBe('2026-10-12');
		expect(weekDays('2026-12-28')).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
		expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
	});

	it('counts a streak back across a week boundary; an unticked today does not break it', () => {
		const run = new Set(['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']); // Fri to Tue
		expect(currentStreak(run, TODAY)).toBe(5);
		expect(currentStreak(new Set([...run, TODAY]), TODAY)).toBe(6);
		// A gap yesterday ends it.
		expect(currentStreak(new Set(['2026-10-11', '2026-10-12']), TODAY)).toBe(0);
		// Across a month and a year.
		expect(currentStreak(new Set(['2026-12-30', '2026-12-31', '2027-01-01']), '2027-01-01')).toBe(3);
	});

	it('finds the longest run anywhere in the ticks', () => {
		expect(longestStreak(['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-04', '2026-10-06', '2026-10-06'])).toBe(3);
		expect(longestStreak([])).toBe(0);
	});

	it('is on track when the target is met or still reachable this week', () => {
		expect(onTrack(5, 5, 1)).toBe(true);
		expect(onTrack(2, 5, 3)).toBe(true);
		expect(onTrack(1, 5, 3)).toBe(false);
	});

	it('turns seed offsets into local days, dropping junk', () => {
		const hs = readHabits(HABITS());
		expect(seedTicks({ read: [0, 1, 1, 2, -1, 'x', 9999], ghost: [0] }, hs, TODAY)).toEqual({
			read: ['2026-10-12', '2026-10-13', TODAY],
			run: []
		});
	});

	it('reads habits: names required, at most 8, unique ids, clamped targets, closed icons', () => {
		const hs = readHabits([
			{ id: 'a', name: '**Read**', icon: 'read', target_per_week: 12 },
			{ id: 'a', name: 'Dup', target_per_week: 0 },
			{ name: 'No id', icon: '<svg>' },
			{ id: 'x' },
			'Water',
			...Array.from({ length: 8 }, (_, i) => ({ name: `Extra ${i}` }))
		]);
		expect(hs).toHaveLength(8);
		expect(hs.slice(0, 4)).toEqual([
			{ id: 'a', name: 'Read', icon: 'read', target_per_week: 7 },
			{ id: 'a-1', name: 'Dup', target_per_week: 1 },
			{ id: 'h3', name: 'No id', target_per_week: 7 },
			{ id: 'h5', name: 'Water', target_per_week: 7 }
		]);
		expect(nextHabitId([{ id: 'h1' }, { id: 'h3' }])).toBe('h4');
	});

	it('reads ticks as valid ISO days for known habits, and toggles one', () => {
		const hs = readHabits(HABITS());
		const ticks = readTicks({ read: ['2026-10-13', '2026-02-30', 'monday', '2026-10-13', '2026-10-12'], ghost: [TODAY] }, hs);
		expect(ticks).toEqual({ read: ['2026-10-12', '2026-10-13'], run: [] });
		const v = toggleTick({ habits: hs, ticks }, 'read', TODAY);
		expect(v.ticks.read).toEqual(['2026-10-12', '2026-10-13', TODAY]);
		expect(toggleTick(v, 'read', '2026-10-12').ticks.read).toEqual(['2026-10-13', TODAY]);
	});

	it('labels days in plain English', () => {
		expect(dayLong(TODAY)).toBe('Wednesday 14 October');
		expect(weekRange(weekDays('2026-10-12'))).toBe('12 to 18 Oct');
		expect(weekRange(weekDays('2026-09-28'))).toBe('28 Sep to 4 Oct');
	});
});

describe('habit-tracker: registry, bind contract, manifest', () => {
	it('resolves the type and every alias to one component', () => {
		for (const t of TYPES) {
			expect(hasWidget(t)).toBe(true);
			expect(getWidget(t)).toBe(getWidget('habit-tracker'));
		}
	});

	it('binds value through onchange without the unregistered warning', () => {
		_resetBindContractWarnings();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		for (const t of TYPES) {
			expect(getBindContract(t)).toEqual({ prop: 'value', event: 'onchange' });
			warnUnregisteredBindContract(t);
		}
		expect(warn).not.toHaveBeenCalled();
	});

	it('has a manifest entry whose example renders four habits', () => {
		const entry = manifestEntries.find((e) => e.type === 'habit-tracker')!;
		expect(entry.description.length).toBeLessThan(200);
		expect(Object.keys(entry.props)).toEqual(['title', 'habits', 'week_start', 'weeks', 'seed']);
		const { container } = render(Ripple, { props: { spec: { state: {}, ui: entry.example } } });
		expect(container.querySelectorAll('[data-habit]')).toHaveLength(4);
	});
});

describe('habit-tracker: ticking', () => {
	it('ticks and unticks today, writing ISO days to the value', async () => {
		const onchange = vi.fn();
		render(HabitTracker, { props: { habits: HABITS(), onchange } });
		expect(pressed('Read, Wednesday 14 October, not done')).toBe('false');

		await fireEvent.click(cell('Read, Wednesday 14 October, not done'));
		expect(pressed('Read, Wednesday 14 October, done')).toBe('true');
		expect(lastValue(onchange).ticks).toEqual({ read: [TODAY], run: [] });
		expect(lastValue(onchange).habits[0]).toEqual({ id: 'read', name: 'Read', icon: 'read', target_per_week: 5 });

		await fireEvent.click(cell('Read, Wednesday 14 October, done'));
		expect(pressed('Read, Wednesday 14 October, not done')).toBe('false');
		expect(lastValue(onchange).ticks.read).toEqual([]);
	});

	it('marks today and never ticks a future day', async () => {
		const onchange = vi.fn();
		render(HabitTracker, { props: { habits: HABITS(), onchange } });
		expect(cell('Read, Wednesday 14 October, not done').getAttribute('aria-current')).toBe('date');
		const thu = cell('Read, Thursday 15 October, not done');
		expect(thu.getAttribute('aria-disabled')).toBe('true');
		await fireEvent.click(thu);
		expect(onchange).not.toHaveBeenCalled();
	});

	it('shows "Done for the week" once the target is met, and the streak', async () => {
		const { container } = render(HabitTracker, { props: { habits: HABITS(), seed: { run: [1, 2, 3, 4] } } });
		const run = container.querySelector('[data-habit="run"]')!;
		// Sat 10 Oct to Tue 13 Oct crosses Monday: 2 this week, a 4-day streak.
		expect(run.getAttribute('data-met')).toBe('true');
		expect(run.textContent).toContain('Done for the week');
		expect(run.querySelector('[data-slot="streak"]')?.textContent?.trim()).toBe('4-day streak');
		const read = container.querySelector('[data-habit="read"]')!;
		expect(read.getAttribute('data-met')).toBeNull();
		expect(read.textContent).toContain('0 of 5 this week');
	});

	it('sums today and the best streak, and says how many habits are on track', async () => {
		const { container } = render(HabitTracker, { props: { habits: HABITS(), seed: { read: [0, 1, 2], run: [5, 6, 7, 8, 9, 10] } } });
		const summary = container.querySelector('[data-slot="summary"]')!.textContent!.replace(/\s+/g, ' ');
		expect(summary).toContain('50%');
		expect(summary).toMatch(/Best streak 6 days/);
		// Read: 3 of 5 with 5 days left. Run: 0 of 2 this week, 5 days left.
		expect(screen.getByText('2 of 2 habits on track this week')).toBeTruthy();
		await fireEvent.click(cell('Run, Wednesday 14 October, not done'));
		expect(container.querySelector('[data-slot="summary"]')!.textContent).toContain('100%');
	});

	it('starts the week on Monday by default and on Sunday when asked', () => {
		const mon = render(HabitTracker, { props: { habits: HABITS() } });
		expect(first(mon.container)).toBe('Read, Monday 12 October, not done');
		cleanup();
		const sun = render(HabitTracker, { props: { habits: HABITS(), week_start: 'sun' } });
		expect(first(sun.container)).toBe('Read, Sunday 11 October, not done');
		expect(sun.container.querySelector('[data-slot="week"]')?.textContent).toContain('11 to 17 Oct');
	});

	it('pages back through history when weeks > 1, and not past it', async () => {
		const { container } = render(HabitTracker, { props: { habits: HABITS(), weeks: 2, seed: { read: [3] } } });
		expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
		await fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
		expect(container.querySelector('[data-slot="week"]')?.textContent).toContain('Last week');
		expect(container.querySelector('[data-slot="week"]')?.textContent).toContain('5 to 11 Oct');
		expect(pressed('Read, Sunday 11 October, done')).toBe('true');
		expect(screen.getByRole('button', { name: 'Previous week' })).toBeDisabled();
		await fireEvent.click(cell('Run, Friday 9 October, not done'));
		expect(pressed('Run, Friday 9 October, done')).toBe('true');
	});

	it('has no week paging with one week', () => {
		render(HabitTracker, { props: { habits: HABITS() } });
		expect(screen.queryByRole('button', { name: 'Previous week' })).toBeNull();
	});
});

describe('habit-tracker: add, rename, remove', () => {
	it('adds a habit with a name, an icon and a target', async () => {
		const onchange = vi.fn();
		const { container } = render(HabitTracker, { props: { habits: HABITS(), onchange } });
		await fireEvent.click(screen.getByRole('button', { name: 'Add habit' }));
		await fireEvent.input(screen.getByRole('textbox', { name: 'Habit name' }), { target: { value: 'Floss' } });
		await fireEvent.click(screen.getByRole('radio', { name: 'No sugar' }));
		await fireEvent.change(screen.getByRole('combobox', { name: 'Times a week' }), { target: { value: '3' } });
		await fireEvent.submit(container.querySelector('form')!);
		expect(lastValue(onchange).habits.at(-1)).toEqual({ id: 'h3', name: 'Floss', icon: 'no-sugar', target_per_week: 3 });
		expect(container.querySelector('[data-habit="h3"]')).not.toBeNull();
		await fireEvent.click(cell('Floss, Wednesday 14 October, not done'));
		expect(lastValue(onchange).ticks.h3).toEqual([TODAY]);
	});

	it('hides Add habit at 8 habits', () => {
		render(HabitTracker, { props: { habits: Array.from({ length: 8 }, (_, i) => ({ id: `x${i}`, name: `H${i}`, target_per_week: 7 })) } });
		expect(screen.queryByRole('button', { name: 'Add habit' })).toBeNull();
	});

	it('renames inline on Enter and cancels on Escape', async () => {
		const onchange = vi.fn();
		render(HabitTracker, { props: { habits: HABITS(), seed: { read: [0] }, onchange } });
		await fireEvent.click(screen.getByRole('button', { name: 'Rename Read' }));
		const box = screen.getByRole('textbox', { name: 'Rename Read' }) as HTMLInputElement;
		box.value = 'Read 30 pages';
		await fireEvent.keyDown(box, { key: 'Enter' });
		expect(lastValue(onchange).habits[0].name).toBe('Read 30 pages');
		expect(lastValue(onchange).ticks.read).toEqual([TODAY]);
		expect(pressed('Read 30 pages, Wednesday 14 October, done')).toBe('true');

		await fireEvent.click(screen.getByRole('button', { name: 'Rename Run' }));
		const run = screen.getByRole('textbox', { name: 'Rename Run' }) as HTMLInputElement;
		run.value = 'Jog';
		await fireEvent.keyDown(run, { key: 'Escape' });
		expect(screen.queryByRole('textbox', { name: 'Rename Run' })).toBeNull();
		expect(lastValue(onchange).habits[1].name).toBe('Run');
	});

	it('removes a habit only after the confirm', async () => {
		const onchange = vi.fn();
		const { container } = render(HabitTracker, { props: { habits: HABITS(), seed: { run: [0] }, onchange } });
		await fireEvent.click(screen.getByRole('button', { name: 'Remove Run' }));
		expect(screen.getByText('Remove Run?')).toBeTruthy();
		await fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
		expect(container.querySelector('[data-habit="run"]')).not.toBeNull();
		expect(onchange).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'Remove Run' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
		expect(container.querySelector('[data-habit="run"]')).toBeNull();
		expect(lastValue(onchange)).toEqual({ habits: [{ id: 'read', name: 'Read', icon: 'read', target_per_week: 5 }], ticks: { read: [] } });
	});
});

describe('habit-tracker: keyboard grid', () => {
	it('has one tab stop on today and moves with the arrows, Home and End', async () => {
		const { container } = render(HabitTracker, { props: { habits: HABITS() } });
		const stops = container.querySelectorAll('[data-cell][tabindex="0"]');
		expect(stops).toHaveLength(1);
		expect(stops[0].getAttribute('data-cell')).toBe('0:2');

		const at = (rc: string) => container.querySelector<HTMLElement>(`[data-cell="${rc}"]`)!;
		at('0:2').focus();
		await fireEvent.keyDown(at('0:2'), { key: 'ArrowRight' });
		expect(document.activeElement).toBe(at('0:3'));
		await fireEvent.keyDown(at('0:3'), { key: 'ArrowDown' });
		expect(document.activeElement).toBe(at('1:3'));
		await fireEvent.keyDown(at('1:3'), { key: 'ArrowDown' });
		expect(document.activeElement).toBe(at('1:3'));
		await fireEvent.keyDown(at('1:3'), { key: 'Home' });
		expect(document.activeElement).toBe(at('1:0'));
		await fireEvent.keyDown(at('1:0'), { key: 'End' });
		expect(document.activeElement).toBe(at('1:6'));
		expect(container.querySelectorAll('[data-cell][tabindex="0"]')).toHaveLength(1);
		expect(at('1:6').getAttribute('tabindex')).toBe('0');
	});

	it('announces a tick politely', async () => {
		const { container } = render(HabitTracker, { props: { habits: HABITS() } });
		await fireEvent.click(cell('Run, Wednesday 14 October, not done'));
		expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('Run, Wednesday 14 October, done. 1 of 2 this week.');
	});
});

describe('habit-tracker: a re-sent spec', () => {
	it('keeps the ticks when the same spec comes back; new habits replace them', async () => {
		const onStateChange = vi.fn();
		const { container, rerender } = render(Ripple, { props: { spec: spec(), onStateChange } });
		await fireEvent.click(cell('Run, Wednesday 14 October, not done'));
		expect(onStateChange).toHaveBeenLastCalledWith('habits', { habits: expect.any(Array), ticks: { read: ['2026-10-13'], run: [TODAY] } }, expect.anything());

		await rerender({ spec: spec() });
		expect(pressed('Run, Wednesday 14 October, done')).toBe('true');
		expect(pressed('Read, Tuesday 13 October, done')).toBe('true');

		await rerender({ spec: spec([{ id: 'walk', name: 'Walk', icon: 'walk', target_per_week: 7 }]) });
		expect(container.querySelectorAll('[data-habit]')).toHaveLength(1);
		expect(pressed('Walk, Wednesday 14 October, not done')).toBe('false');
	});

	it('works the same unbound', async () => {
		const { rerender } = render(Ripple, { props: { spec: ui() } });
		await fireEvent.click(cell('Read, Monday 12 October, not done'));
		await rerender({ spec: ui() });
		expect(pressed('Read, Monday 12 October, done')).toBe('true');
	});
});

describe('habit-tracker: streaming', () => {
	it('streams with id-less, icon-less and half-written habits and ends equal to the whole render', async () => {
		await expectStreamParity({
			state: {},
			ui: {
				type: 'habit-tracker',
				bind: '{state.habits}',
				props: {
					title: 'My week',
					weeks: 2,
					week_start: 'sun',
					habits: [
						{ id: 'read', name: 'Read 20 pages', icon: 'read', target_per_week: 5 },
						{ name: 'Run', icon: 'run', target_per_week: 3 },
						{},
						'Drink water',
						{ id: 'm', name: 'Meditate', icon: 'lotus' }
					],
					seed: { read: [0, 1, 2, 8], h2: [1, 3], m: [0] }
				}
			}
		});
	});
});

describe('habit-tracker: junk props', () => {
	it.each([
		['wrong types everywhere', { habits: 'read', week_start: 'tue', weeks: 'lots', seed: [1, 2], title: 7, value: 'x' }],
		['junk rows', { habits: [null, 3, { name: { x: 1 } }, { id: 'a', name: 'A', target_per_week: 'daily' }], weeks: 99, seed: { a: 'today' } }],
		['a junk bound value', { habits: HABITS(), value: { habits: [{ name: 'B' }], ticks: { h1: ['soon', 4] } } }],
		['nothing at all', {}]
	])('%s renders without throwing', (_name, props) => {
		const { container } = render(HabitTracker, { props: props as never });
		expect(container.querySelector('[data-widget="habit-tracker"]')).not.toBeNull();
	});

	it('shows the empty line and the add button with no habits', () => {
		render(HabitTracker, { props: {} });
		expect(screen.getByText('No habits yet. Add one to start a streak.')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Add habit' })).toBeTruthy();
	});
});
