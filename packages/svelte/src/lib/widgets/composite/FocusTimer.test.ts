// widgets/composite/FocusTimer.test.ts: the focus-timer data widget on fake
// timers and a fake Date. Registry and bind contract, the phase cycle (long
// break every Nth round), auto start, pause and resume, skip, reset, a hidden
// tab that only moves Date, clamped durations, the dial button, the bound value, a
// re-sent spec, a restored session, stream parity and junk props.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget, hasWidget } from '../index.js';
import { _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import FocusTimer, { nextPhase, type FocusValue } from './FocusTimer.svelte';

const TYPES = ['focus-timer', 'pomodoro', 'pomodoro-timer'];
const MIN = 60_000;
const T0 = new Date('2026-10-10T09:00:00.000Z').getTime();

const btn = (name: string | RegExp) => screen.getByRole('button', { name });
const advance = async (ms: number) => {
	await vi.advanceTimersByTimeAsync(ms);
	await tick();
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(T0);
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
	delete (document as { hidden?: boolean }).hidden;
});

const mount = (props: Record<string, unknown> = {}) => {
	const got: FocusValue[] = [];
	const r = render(FocusTimer, { props: { focus_min: 2, short_break_min: 1, long_break_min: 3, rounds_before_long: 2, onchange: (v: FocusValue) => got.push(v), ...props } });
	const q = (slot: string) => r.container.querySelector(`[data-slot="${slot}"]`)?.textContent?.replace(/\s+/g, ' ').trim();
	return {
		...r,
		got,
		last: () => got.at(-1),
		clock: () => q('clock'),
		phase: () => q('phase'),
		state: () => q('state'),
		live: () => q('live'),
		dots: () => r.container.querySelectorAll('[data-slot="rounds"] [data-done]').length
	};
};

describe('focus-timer: registry and bind contract', () => {
	it('resolves the type and every alias to one component', () => {
		for (const t of TYPES) {
			expect(hasWidget(t)).toBe(true);
			expect(getWidget(t)).toBe(getWidget('focus-timer'));
		}
	});

	it('binds value through onchange for every alias, without the unregistered warning', () => {
		for (const t of TYPES) expect(getBindContract(t)).toEqual({ prop: 'value', event: 'onchange' });
		_resetBindContractWarnings();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		for (const t of TYPES) warnUnregisteredBindContract(t);
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('focus-timer: the cycle', () => {
	it('nextPhase: focus to short, every Nth focus to long, a break back to focus', () => {
		expect([nextPhase('focus', 1, 4), nextPhase('focus', 3, 4), nextPhase('focus', 4, 4), nextPhase('focus', 8, 4)]).toEqual(['short', 'short', 'long', 'long']);
		expect([nextPhase('short', 1, 4), nextPhase('long', 4, 4), nextPhase('focus', 0, 4)]).toEqual(['focus', 'focus', 'short']);
	});

	it('runs focus, waits with a call to action, then the long break after the Nth round', async () => {
		const w = mount();
		expect([w.phase(), w.clock(), w.state()]).toEqual(['Focus', '2:00', 'Ready']);

		await fireEvent.click(btn('Start'));
		expect(w.live()).toBe('Focus, 2 minutes.');
		await advance(30_000);
		expect(w.clock()).toBe('1:30');
		const announced = w.live();
		await advance(10_000);
		expect(w.live()).toBe(announced); // never per second

		await advance(90_000);
		expect([w.phase(), w.clock(), w.state()]).toEqual(['Short break', '1:00', 'Up next']);
		expect(w.container.querySelector('[data-slot="cta"]')?.textContent).toContain('Round 1 done');
		expect(w.live()).toBe('Focus round 1 done. Short break next, 1 minutes.');
		expect(w.dots()).toBe(1);
		expect(w.last()).toMatchObject({ phase: 'short', running: false, rounds_done: 1, remaining_s: 60, log: [new Date(T0 + 2 * MIN).toISOString()] });

		await advance(5 * MIN);
		expect(w.clock()).toBe('1:00'); // waits, no auto start
		await fireEvent.click(btn('Start short break'));
		await advance(MIN);
		expect([w.phase(), w.state()]).toEqual(['Focus', 'Up next']);
		await fireEvent.click(btn('Start focus'));
		await advance(2 * MIN);
		expect([w.phase(), w.clock()]).toEqual(['Long break', '3:00']);
		expect(w.last()?.rounds_done).toBe(2);
		expect(w.dots()).toBe(2);
	});

	it('auto_start_next carries straight on', async () => {
		const w = mount({ auto_start_next: true });
		await fireEvent.click(btn('Start'));
		await advance(2 * MIN);
		expect([w.phase(), w.state()]).toEqual(['Short break', 'Short break']);
		await advance(MIN + 2 * MIN);
		expect(w.phase()).toBe('Long break');
		expect(w.last()).toMatchObject({ phase: 'long', running: true, rounds_done: 2 });
	});

	it('flashes the dial at a phase end, and the flash goes away', async () => {
		const w = mount();
		await fireEvent.click(btn('Start'));
		await advance(2 * MIN);
		expect(w.container.querySelector('[data-slot="dial"]')?.hasAttribute('data-flash')).toBe(true);
		await advance(1500);
		expect(w.container.querySelector('[data-slot="dial"]')?.hasAttribute('data-flash')).toBe(false);
	});
});

describe('focus-timer: controls', () => {
	it('pause holds the time and resume carries on from it', async () => {
		const w = mount();
		await fireEvent.click(btn('Start'));
		await advance(20_000);
		await fireEvent.click(btn('Pause'));
		expect([w.state(), w.clock(), w.live()]).toEqual(['Paused', '1:40', 'Paused.']);
		expect(w.last()).toMatchObject({ running: false, remaining_s: 100 });
		await advance(5 * MIN);
		expect(w.clock()).toBe('1:40');
		await fireEvent.click(btn('Resume'));
		await advance(10_000);
		expect(w.clock()).toBe('1:30');
	});

	it('skip ends the phase without credit; reset returns it to full length', async () => {
		const w = mount();
		await fireEvent.click(btn('Skip focus'));
		expect([w.phase(), w.clock(), w.state()]).toEqual(['Short break', '1:00', 'Ready']);
		expect(w.last()).toMatchObject({ phase: 'short', rounds_done: 0, log: [] });

		await fireEvent.click(btn('Start'));
		await advance(15_000);
		await fireEvent.click(btn('Skip short break'));
		expect([w.phase(), w.clock()]).toEqual(['Focus', '2:00']);
		await advance(30_000);
		expect(w.clock()).toBe('1:30'); // still running

		await fireEvent.click(btn('Reset focus'));
		expect([w.clock(), w.state()]).toEqual(['2:00', 'Ready']);
		await advance(30_000);
		expect(w.clock()).toBe('2:00');
	});

	it('the dial is a labelled button that starts and pauses (Space and Enter come with the button)', async () => {
		const w = mount();
		const dial = screen.getByRole('button', { name: 'Start. Focus, 2:00 left' });
		await fireEvent.click(dial);
		expect(w.last()?.running).toBe(true);
		await advance(10_000);
		await fireEvent.click(screen.getByRole('button', { name: 'Pause. Focus, 1:50 left' }));
		expect(w.last()).toMatchObject({ running: false, remaining_s: 110 });
	});
});

describe('focus-timer: hidden tab', () => {
	const hide = (hidden: boolean) => {
		Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
		document.dispatchEvent(new Event('visibilitychange'));
	};

	it('keeps time from the start timestamp when only Date moves', async () => {
		const w = mount();
		await fireEvent.click(btn('Start'));
		hide(true);
		vi.setSystemTime(T0 + 50_000); // no ticks fire
		hide(false);
		await tick();
		expect(w.clock()).toBe('1:10');
	});

	it('closes a phase that ended while hidden at its own end time', async () => {
		const w = mount();
		await fireEvent.click(btn('Start'));
		hide(true);
		vi.setSystemTime(T0 + 10 * MIN);
		hide(false);
		await tick();
		expect([w.phase(), w.state()]).toEqual(['Short break', 'Up next']);
		expect(w.last()).toMatchObject({ rounds_done: 1, log: [new Date(T0 + 2 * MIN).toISOString()] });
	});

	it('with auto start, catches up across several phases', async () => {
		const w = mount({ auto_start_next: true });
		await fireEvent.click(btn('Start'));
		hide(true);
		// focus 0-2, short 2-3, focus 3-5, long 5-8, focus 8-10: at 8.5 min, 1:30 into focus
		vi.setSystemTime(T0 + 8.5 * MIN);
		hide(false);
		await tick();
		expect([w.phase(), w.clock()]).toEqual(['Focus', '1:30']);
		expect(w.last()?.log).toEqual([new Date(T0 + 2 * MIN).toISOString(), new Date(T0 + 5 * MIN).toISOString()]);
	});
});

describe('focus-timer: durations', () => {
	const setBox = async (name: string, v: string) => {
		const box = screen.getByRole('spinbutton', { name }) as HTMLInputElement;
		await fireEvent.input(box, { target: { value: v } });
		await fireEvent.change(box);
		return box;
	};

	it('clamps props and edits to their ranges', async () => {
		const w = mount({ focus_min: 500, short_break_min: 0, long_break_min: 'x', rounds_before_long: -3 });
		expect(w.clock()).toBe('120:00');
		expect((screen.getByRole('spinbutton', { name: 'Short break' }) as HTMLInputElement).value).toBe('1');
		expect((screen.getByRole('spinbutton', { name: 'Long break' }) as HTMLInputElement).value).toBe('15');
		expect((screen.getByRole('spinbutton', { name: 'Long break every' }) as HTMLInputElement).value).toBe('1');

		expect((await setBox('Focus', '0')).value).toBe('1');
		expect(w.clock()).toBe('1:00');
		expect((await setBox('Focus', '999')).value).toBe('120');
		expect((await setBox('Focus', '50')).value).toBe('50');
		expect([w.clock(), w.last()?.remaining_s]).toEqual(['50:00', 3000]);
	});

	it('a new length mid-phase applies from the next phase', async () => {
		const w = mount();
		await fireEvent.click(btn('Start'));
		await setBox('Short break', '4');
		await setBox('Focus', '9');
		expect(w.clock()).toBe('2:00');
		expect(screen.getByText('The new length starts with the next phase.')).toBeTruthy();
		await advance(2 * MIN);
		expect(w.clock()).toBe('4:00');
	});
});

describe('focus-timer: bound value and a re-sent spec', () => {
	const spec = (props: Record<string, unknown> = {}, state: Record<string, unknown> = {}) => ({
		state,
		ui: { type: 'focus-timer', bind: '{state.focus}', props: { focus_min: 2, short_break_min: 1, task: 'Write the brief', ...props } }
	});
	const lastFocus = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.filter(([p]) => p === 'focus').at(-1)?.[1] as FocusValue | undefined;

	it('writes the session to state and keeps it when the same spec comes back', async () => {
		const onStateChange = vi.fn();
		const { container, rerender } = render(Ripple, { props: { spec: spec(), onStateChange } });
		const box = screen.getByRole('textbox', { name: 'Focusing on' }) as HTMLInputElement;
		await fireEvent.input(box, { target: { value: 'Edit chapter 3' } });
		await fireEvent.change(box);
		await fireEvent.click(btn('Start'));
		await advance(2 * MIN);
		expect(lastFocus(onStateChange)).toMatchObject({ phase: 'short', rounds_done: 1, task: 'Edit chapter 3', running: false });

		await rerender({ spec: spec() });
		await tick();
		const q = (s: string) => container.querySelector(`[data-slot="${s}"]`)?.textContent?.trim();
		expect([q('phase'), q('state')]).toEqual(['Short break', 'Up next']);
		expect((screen.getByRole('textbox', { name: 'Focusing on' }) as HTMLInputElement).value).toBe('Edit chapter 3');
		expect(container.querySelectorAll('[data-slot="log"] li')).toHaveLength(1);

		await rerender({ spec: spec({ task: 'Plan the launch' }) });
		await tick();
		expect((screen.getByRole('textbox', { name: 'Focusing on' }) as HTMLInputElement).value).toBe('Plan the launch');
		expect(q('phase')).toBe('Short break');
	});

	it('restores a bound session, paused', async () => {
		const saved: FocusValue = { phase: 'focus', remaining_s: 45, running: true, rounds_done: 3, task: 'Inbox zero', log: ['2026-10-10T08:00:00.000Z', 'bad', '2026-10-10T08:30:00.000Z'] };
		const { container } = render(Ripple, { props: { spec: spec({}, { focus: saved }) } });
		await tick();
		const q = (s: string) => container.querySelector(`[data-slot="${s}"]`)?.textContent?.trim();
		expect([q('phase'), q('clock'), q('state')]).toEqual(['Focus', '0:45', 'Paused']);
		expect((screen.getByRole('textbox', { name: 'Focusing on' }) as HTMLInputElement).value).toBe('Inbox zero');
		expect(container.querySelectorAll('[data-slot="log"] li')).toHaveLength(2);
		expect(container.querySelectorAll('[data-slot="rounds"] [data-done]')).toHaveLength(3);
	});

	it('streams and ends equal to the whole render', async () => {
		vi.useRealTimers();
		await expectStreamParity({
			ui: {
				type: 'focus-timer',
				props: { title: 'Deep work', focus_min: 50, short_break_min: 10, long_break_min: 30, rounds_before_long: 3, goal_rounds: 6, task: 'Draft the quarterly update' }
			}
		});
	});
});

describe('focus-timer: junk props', () => {
	it.each([
		['wrong types everywhere', { focus_min: 'long', short_break_min: null, rounds_before_long: {}, goal_rounds: 'x', task: 7, title: [], auto_start_next: 'maybe', value: 'nope' }],
		['a junk bound value', { value: { phase: 'nap', remaining_s: 'x', rounds_done: -4, log: 'today' } }],
		['nothing at all', {}]
	])('%s renders without throwing', (_name, props) => {
		const { container } = render(FocusTimer, { props: props as never });
		expect(container.querySelector('[data-widget="focus-timer"]')).not.toBeNull();
		expect(container.querySelector('[data-slot="clock"]')?.textContent?.trim()).toBe('25:00');
	});

	it('shows the goal against the rounds', () => {
		const { container } = render(FocusTimer, { props: { goal_rounds: 6 } });
		expect(container.querySelectorAll('[data-slot="rounds"] span.rounded-full')).toHaveLength(6);
		expect(screen.getByRole('img', { name: '0 of 6 rounds' })).toBeTruthy();
	});
});
