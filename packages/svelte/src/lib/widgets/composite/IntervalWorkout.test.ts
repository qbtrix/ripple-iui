// widgets/composite/IntervalWorkout.test.ts — the interval-workout data widget:
// registry and bind-contract wiring, the work stepper writing workSec back to
// state, streamed parity with id-less and bare-string exercises, junk props,
// the session plan, and the timer itself on fake timers (work, rest, next
// exercise, round change, finish, pause on a hidden tab, a work-time change
// that waits for the next interval).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget, hasWidget } from '../index.js';
import { _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import IntervalWorkout, { buildPlan, clampSec, clock, REST, WORK, type WorkoutExercise } from './IntervalWorkout.svelte';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const TYPES = ['interval-workout', 'workout-timer', 'interval-timer', 'hiit-timer'];
const two = (): WorkoutExercise[] => [
	{ id: 'a', name: 'Jumping jacks', cue: 'Land softly.', kind: 'cardio' },
	{ id: 'b', name: 'Squats', cue: 'Chest up.', kind: 'strength' }
];

/** The plan as `w0.0` (phase, exercise, round) for compact asserts. */
const p = (kinds: (string | undefined)[], rounds = 1) => buildPlan(kinds, rounds).map((iv) => `${iv.phase[0]}${iv.ex}.${iv.round}`);
const btn = (name: string | RegExp) => screen.getByRole('button', { name });
const advance = async (ms: number) => {
	await vi.advanceTimersByTimeAsync(ms);
	await tick();
};

describe('interval-workout: registry and bind contract', () => {
	it('resolves the type and every alias to one component', () => {
		for (const t of TYPES) {
			expect(hasWidget(t)).toBe(true);
			expect(getWidget(t)).toBe(getWidget('interval-workout'));
		}
	});

	it('binds workSec through onworksecchange, for every alias, without the unregistered warning', () => {
		for (const t of TYPES) expect(getBindContract(t)).toEqual({ prop: 'workSec', event: 'onworksecchange' });
		_resetBindContractWarnings();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		for (const t of TYPES) warnUnregisteredBindContract(t);
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('interval-workout: bound workSec', () => {
	it('the work stepper writes a new workSec to state', async () => {
		const onStateChange = vi.fn();
		render(Ripple, {
			props: {
				spec: { state: { workSec: 40 }, ui: { type: 'interval-workout', bind: '{state.workSec}', props: { exercises: two(), restSec: 20 } } },
				onStateChange
			}
		});
		await fireEvent.click(screen.getByRole('button', { name: 'More work time' }));
		expect(onStateChange).toHaveBeenLastCalledWith('workSec', 45, expect.anything());
		expect(screen.getByRole('group', { name: 'Work time' }).textContent).toContain('45s');
		await fireEvent.click(screen.getByRole('button', { name: 'Less work time' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Less work time' }));
		expect(onStateChange).toHaveBeenLastCalledWith('workSec', 35, expect.anything());
	});

	it('a Svelte parent sees the new value, clamped to the range', async () => {
		const got: number[] = [];
		render(IntervalWorkout, { props: { exercises: two(), workSec: 600, onworksecchange: (v: number) => got.push(v) } });
		expect(screen.getByRole('button', { name: 'More work time' })).toBeDisabled();
		await fireEvent.click(screen.getByRole('button', { name: 'Less work time' }));
		expect(got).toEqual([595]);
	});
});

describe('interval-workout: streaming', () => {
	it('streams with id-less, bare-string and nameless exercises and ends equal to the whole render', async () => {
		await expectStreamParity({
			ui: {
				type: 'interval-workout',
				props: {
					title: '20-minute home HIIT',
					verdict: { text: 'Ten moves, twice through.', status: 'info' },
					workSec: 40,
					restSec: 20,
					rounds: 2,
					exercises: [
						{ name: 'Jumping jacks', cue: 'Land softly and keep a steady rhythm.', kind: 'cardio' },
						{},
						'Burpees',
						{ name: 'Plank', kind: 'yoga' },
						{ name: 'Water break', kind: 'rest' }
					]
				}
			}
		});
	});
});

describe('interval-workout: junk props', () => {
	it.each([
		['wrong types everywhere', { exercises: 'squats', workSec: 'fast', restSec: null, rounds: 'many', step: 'x', title: 7 }],
		['junk rows', { exercises: [null, 3, { name: { x: 1 } }, { cue: 'no name' }, { name: '**Lunges**', kind: 5 }], workSec: -10, rounds: 99 }],
		['a step past the end', { exercises: two(), step: 50 }],
		['nothing at all', {}]
	])('%s renders without throwing', (_name, props) => {
		const { container } = render(IntervalWorkout, { props: props as never });
		expect(container.querySelector('[data-widget="interval-workout"]')).not.toBeNull();
	});

	it('shows the empty line and no player without exercises', () => {
		const { container } = render(IntervalWorkout, { props: {} });
		expect(screen.getByText('No exercises yet. Ask for a workout.')).toBeTruthy();
		expect(container.querySelector('[data-slot="player"]')).toBeNull();
	});

	it('strips markdown from names and clamps a past-the-end step to the last interval', () => {
		const { container } = render(IntervalWorkout, { props: { exercises: [{ name: '**Lunges**' }, { name: 'Squats' }] as never, step: 50 } });
		expect(container.querySelector('[data-slot="current"]')?.textContent).toBe('Squats');
		expect(screen.getAllByText('Lunges').length).toBeGreaterThan(0);
	});
});

describe('interval-workout: plan and helpers', () => {
	it('puts a rest between exercises, across rounds, never next to a rest-kind exercise', () => {
		expect(p([undefined, undefined])).toEqual(['w0.0', 'r1.0', 'w1.0']);
		expect(p([undefined, undefined], 2)).toEqual(['w0.0', 'r1.0', 'w1.0', 'r0.1', 'w0.1', 'r1.1', 'w1.1']);
		expect(p(['cardio', 'rest', 'core'])).toEqual(['w0.0', 'r1.0', 'w2.0']);
		expect(p([])).toEqual([]);
	});

	it('clamps seconds and formats the clock', () => {
		expect([clampSec('45', WORK), clampSec(2, WORK), clampSec(9999, WORK), clampSec('x', WORK), clampSec(undefined, REST)]).toEqual([45, 5, 600, 40, 20]);
		expect(clampSec(0, REST)).toBe(0);
		expect([clock(40), clock(65), clock(1180), clock(-3), clock(0.2)]).toEqual(['0:40', '1:05', '19:40', '0:00', '0:01']);
	});

	it('headlines total time from the timings', () => {
		const exercises = Array.from({ length: 10 }, (_, i) => ({ name: `Move ${i + 1}` }));
		const { container } = render(IntervalWorkout, { props: { exercises, workSec: 40, restSec: 20, rounds: 2 } });
		// 20 × 40s work + 19 × 20s rest = 19:40, about 20 minutes
		expect(container.querySelector('[data-slot="meta"]')?.textContent).toContain('20 min');
		expect(screen.getByText('19:40 left')).toBeTruthy();
	});
});

describe('interval-workout: the timer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
		delete (document as { hidden?: boolean }).hidden;
	});

	const mount = (props: Record<string, unknown> = {}) => {
		const r = render(IntervalWorkout, { props: { exercises: two(), workSec: 5, restSec: 2, rounds: 2, ...props } });
		const q = (slot: string) => r.container.querySelector(`[data-slot="${slot}"]`)?.textContent?.replace(/\s+/g, ' ').trim();
		return { ...r, clock: () => q('clock'), phase: () => q('phase'), current: () => q('current'), next: () => q('next') };
	};

	it('counts work, then rest, then the next exercise, then the next round, then finishes', async () => {
		const w = mount();
		expect([w.phase(), w.clock(), w.current()]).toEqual(['Ready', '5', 'Jumping jacks']);
		expect(w.next()).toBe('Next: Squats');

		await fireEvent.click(btn('Start'));
		expect(w.phase()).toBe('Work');
		await advance(1000);
		expect(w.clock()).toBe('4'); // Date.now is faked: the deadline moved

		await advance(4000);
		expect([w.phase(), w.current(), w.clock()]).toEqual(['Rest', 'Rest', '2']);
		expect(w.next()).toContain('Up next: Squats');

		await advance(2000);
		expect([w.phase(), w.current(), w.clock()]).toEqual(['Work', 'Squats', '5']);
		expect(screen.getByText(/Exercise 2 of 2 · Round 1 of 2/)).toBeTruthy();

		await advance(5000 + 2000);
		expect([w.phase(), w.current()]).toEqual(['Work', 'Jumping jacks']);
		expect(screen.getByText(/Exercise 1 of 2 · Round 2 of 2/)).toBeTruthy();

		await advance(5000 + 2000 + 5000);
		expect(screen.getByText('Workout done')).toBeTruthy();
		expect(w.container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');

		await fireEvent.click(btn('Start again'));
		expect([w.phase(), w.current(), w.clock()]).toEqual(['Work', 'Jumping jacks', '5']);
	});

	it('pause holds the time and resume carries on from it', async () => {
		const w = mount();
		await fireEvent.click(btn('Start'));
		await advance(1000);
		await fireEvent.click(btn('Pause'));
		expect(w.phase()).toBe('Paused');
		await advance(5000);
		expect(w.clock()).toBe('4');
		await fireEvent.click(btn('Resume'));
		await advance(1000);
		expect(w.clock()).toBe('3');
	});

	it('pauses when the tab is hidden and waits for the visitor', async () => {
		const w = mount();
		await fireEvent.click(btn('Start'));
		await advance(1000);
		Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
		document.dispatchEvent(new Event('visibilitychange'));
		await tick();
		expect(w.phase()).toBe('Paused');
		expect(w.container.querySelector('[data-slot="away"]')).not.toBeNull();
		await advance(10_000);
		expect(w.clock()).toBe('4');

		delete (document as { hidden?: boolean }).hidden;
		document.dispatchEvent(new Event('visibilitychange'));
		await advance(1000);
		expect(w.clock()).toBe('4'); // never auto-resumes
		await fireEvent.click(btn('Resume'));
		expect(w.container.querySelector('[data-slot="away"]')).toBeNull();
		await advance(1000);
		expect(w.clock()).toBe('3');
	});

	it('a work-time change mid-interval applies from the next interval', async () => {
		const w = mount();
		await fireEvent.click(btn('Start'));
		await advance(1000);
		await w.rerender({ workSec: 10 });
		expect(w.clock()).toBe('4');
		expect(screen.getByText('Your change starts with the next interval.')).toBeTruthy();
		await advance(4000);
		expect(w.phase()).toBe('Rest');
		await advance(2000);
		expect([w.current(), w.clock()]).toEqual(['Squats', '10']);
	});

	it('next and back skip to exercises (not rests), running or paused', async () => {
		const w = mount();
		await fireEvent.click(btn('Next exercise'));
		expect([w.current(), w.phase(), w.clock()]).toEqual(['Squats', 'Work', '5']);
		await fireEvent.click(btn('Start'));
		await advance(1000);
		await fireEvent.click(btn('Previous exercise'));
		expect([w.current(), w.clock()]).toEqual(['Jumping jacks', '5']);
		await advance(1000);
		expect(w.clock()).toBe('4'); // still running

		await fireEvent.click(screen.getAllByRole('button', { name: /Squats/ })[0]);
		expect(w.current()).toBe('Squats');
	});

	it('skips a zero-second rest', async () => {
		const w = mount({ restSec: 0, rounds: 1 });
		await fireEvent.click(btn('Start'));
		await advance(5000);
		await advance(200);
		expect([w.phase(), w.current()]).toEqual(['Work', 'Squats']);
	});
});
