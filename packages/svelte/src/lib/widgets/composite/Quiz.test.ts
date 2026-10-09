// widgets/composite/Quiz.test.ts — the quiz data widget: registry, bind
// contract and manifest wiring; scoring, streak and bands; play through Ripple
// (bound value, on_complete once); the countdown under fake timers; the review
// list; Retry with a reshuffle; keyboard play; bad data; a re-sent spec keeping
// progress; and stream parity.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { manifestEntries } from '$lib/manifest/index.js';
import { getWidget, hasWidget } from '../index.js';
import { _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import Quiz from './Quiz.svelte';
import { bandOf, bestStreakOf, cleanQuestions, scoreOf, streakOf, toPlay, type QuizItem, type QuizValue } from './quiz.js';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const TYPES = ['quiz', 'trivia', 'trivia-quiz'];
const space = (): QuizItem[] => [
	{ id: 'day', prompt: 'Shortest day?', choices: ['Earth', 'Jupiter', 'Mars'], answer: 1, why: 'Jupiter spins in under 10 hours.' },
	{ id: 'star', prompt: 'Closest star to the Sun?', choices: ['Sirius', 'Proxima Centauri'], answer: 1, why: 'About 4.2 light years.' },
	{ id: 'moon', prompt: 'Planet with the most moons?', choices: ['Saturn', 'Earth', 'Venus', 'Mercury'], answer: 0 }
];
const slot = (c: Element, s: string) => c.querySelector(`[data-slot="${s}"]`)?.textContent?.replace(/\s+/g, ' ').trim();
const choice = (name: string | RegExp) => screen.getByRole('radio', { name });
const pick = async (name: string | RegExp) => fireEvent.click(choice(name));
const next = async () => fireEvent.click(screen.getByRole('button', { name: /^(Next|See results)$/ }));
const marks = (c: Element) => [...c.querySelectorAll('[data-mark]')].map((m) => m.getAttribute('data-mark'));

describe('quiz: registry, bind contract, manifest', () => {
	it('resolves the type and every alias to one component', () => {
		for (const t of TYPES) {
			expect(hasWidget(t)).toBe(true);
			expect(getWidget(t)).toBe(getWidget('quiz'));
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

	it('has a manifest entry whose example is playable', () => {
		const entry = manifestEntries.find((e) => e.type === 'quiz');
		expect(entry?.props.questions.required).toBe(true);
		expect(entry?.events?.on_complete).toBeTruthy();
		render(Ripple, { props: { spec: { state: {}, ui: entry!.example } } });
		expect(screen.getAllByRole('radio')).toHaveLength(4);
	});
});

describe('quiz: rules', () => {
	const qs = cleanQuestions(space());

	it('scores right answers only; a timeout is a miss', () => {
		expect(scoreOf(qs, [])).toBe(0);
		expect(scoreOf(qs, [1, 1, 0])).toBe(3);
		expect(scoreOf(qs, [0, null, 0])).toBe(1);
	});

	it('counts the current streak and the best one', () => {
		expect(streakOf(qs, [1, 0, 0])).toBe(1);
		expect(streakOf(qs, [1, 1, 0])).toBe(3);
		expect(streakOf(qs, [1, 1, null])).toBe(0);
		expect(bestStreakOf(qs, [1, 1, null])).toBe(2);
	});

	it('bands the score', () => {
		expect(bandOf(10, 10).word).toBe('Expert');
		expect(bandOf(9, 10).word).toBe('Expert');
		expect(bandOf(7, 10).word).toBe('Sharp');
		expect(bandOf(5, 10).word).toBe('Getting there');
		expect(bandOf(1, 10).word).toBe('Warming up');
		expect(bandOf(0, 0).word).toBe('Warming up');
	});

	it('normalises a bound value', () => {
		expect(toPlay(undefined)).toBeUndefined();
		expect(toPlay({ index: 9, answers: [1, 'x', -2, null] })).toEqual({ index: 4, answers: [1, null, null, null] });
	});
});

describe('quiz: play through Ripple', () => {
	it('writes the bound value and fires on_complete once with { score, total }', async () => {
		const onStateChange = vi.fn();
		const onEvent = vi.fn();
		const { container } = render(Ripple, {
			props: {
				spec: {
					state: {},
					ui: { type: 'quiz', bind: '{state.quiz}', props: { questions: space() }, on_complete: { action: 'emit', target: 'quiz-done' } }
				},
				onStateChange,
				onEvent
			}
		});
		const last = () => onStateChange.mock.calls.filter(([p]) => p === 'quiz').at(-1)?.[1] as QuizValue;

		await pick('Jupiter');
		expect(last()).toEqual({ index: 0, answers: [1], score: 1, done: false });
		expect(slot(container, 'outcome')).toBe('Correct');
		expect(slot(container, 'why')).toBe('Jupiter spins in under 10 hours.');
		await next();
		expect(last().index).toBe(1);
		await pick('Sirius');
		expect(slot(container, 'outcome')).toBe('Not quite');
		// The right one is marked with a word, not just a colour.
		expect(choice(/Proxima Centauri/).closest('label')!.textContent).toContain('Correct answer');
		expect(choice(/Sirius/).closest('label')!.textContent).toContain('Your pick');
		await next();
		await pick('Saturn');
		expect(last()).toEqual({ index: 2, answers: [1, 0, 0], score: 2, done: true });
		await next();
		expect(last().index).toBe(3);

		await vi.waitFor(() => expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'emit' })));
		const emits = onEvent.mock.calls.map(([e]) => e).filter((e) => e?.type === 'emit');
		expect(emits).toHaveLength(1);
		expect(emits[0].payload).toEqual({ score: 2, total: 3 });
		expect(slot(container, 'score')).toBe('Score: 2 / 3');
	});
});

describe('quiz: the game', () => {
	it('moves the rail, the position, the score and the streak', async () => {
		const { container } = render(Quiz, { props: { questions: space() } });
		expect(marks(container)).toEqual(['now', 'todo', 'todo']);
		expect(slot(container, 'position')).toBe('Question 1 of 3');
		await pick('Jupiter');
		await next();
		await pick('Proxima Centauri');
		expect(slot(container, 'streak')).toBe('Streak 2');
		expect(slot(container, 'outcome')).toBe('Correct, 2 in a row');
		await next();
		expect(marks(container)).toEqual(['right', 'right', 'now']);
		expect(slot(container, 'tally')).toBe('Score 2');
		await pick('Earth');
		expect(marks(container)).toEqual(['right', 'right', 'wrong']);
		expect(slot(container, 'streak')).toBe('Streak 0');
	});

	it('ends with the score, a band and a review of the misses with their explanations', async () => {
		const done = vi.fn();
		const { container } = render(Quiz, { props: { questions: space(), oncomplete: done } });
		await pick('Mars');
		await next();
		await pick('Proxima Centauri');
		await next();
		await pick('Venus');
		expect(done).toHaveBeenCalledTimes(1);
		await next();

		expect(slot(container, 'score')).toBe('Score: 1 / 3');
		expect(slot(container, 'band')).toBe('Warming up');
		const review = container.querySelector('[data-slot="review"]')!;
		const rows = [...review.querySelectorAll('li')].map((li) => li.textContent!.replace(/\s+/g, ' ').trim());
		expect(rows).toHaveLength(2);
		expect(rows[0]).toContain('Shortest day?');
		expect(rows[0]).toContain('You said Mars');
		expect(rows[0]).toContain('Answer: Jupiter');
		expect(rows[0]).toContain('Jupiter spins in under 10 hours.');
		expect(rows[1]).toContain('Answer: Saturn');
		expect(review.textContent).not.toContain('Closest star');
		expect(screen.getByText('Quiz complete. 1 of 3. Warming up.')).toBeTruthy();
		expect(done).toHaveBeenCalledWith({ score: 1, total: 3 });
	});

	it('says so when nothing was missed', async () => {
		render(Quiz, { props: { questions: space() } });
		for (const name of ['Jupiter', 'Proxima Centauri', 'Saturn']) {
			await pick(name);
			await next();
		}
		expect(screen.getByText(/A perfect run/)).toBeTruthy();
		expect(screen.getByText('Expert')).toBeTruthy();
	});

	it('Retry starts over, writes a fresh value, and reshuffles when shuffle_choices is on', async () => {
		const values: QuizValue[] = [];
		const done = vi.fn();
		const questions = [{ prompt: 'Pick the planet', choices: ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter'], answer: 2 }, ...space()];
		const { container } = render(Quiz, { props: { questions, shuffle_choices: true, onchange: (v: QuizValue) => values.push(v), oncomplete: done } });
		const orderNow = () => screen.getAllByRole('radio').map((r) => r.closest('label')!.getAttribute('data-choice'));
		const first = orderNow();
		expect(first.map(Number).toSorted((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
		for (const name of ['Earth', 'Jupiter', 'Sirius', 'Saturn']) {
			await pick(name);
			await next();
		}
		expect(slot(container, 'score')).toBe('Score: 3 / 4');

		await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
		expect(values.at(-1)).toEqual({ index: 0, answers: [], score: 0, done: false });
		expect(slot(container, 'position')).toBe('Question 1 of 4');
		expect(marks(container)).toEqual(['now', 'todo', 'todo', 'todo']);
		expect(orderNow()).not.toEqual(first);

		// A second run completes and reports again: once per run.
		for (const name of ['Earth', 'Jupiter', 'Proxima Centauri', 'Saturn']) {
			await pick(name);
			await next();
		}
		expect(done.mock.calls).toEqual([[{ score: 3, total: 4 }], [{ score: 4, total: 4 }]]);
	});
});

describe('quiz: keyboard', () => {
	it('1 to 5 pick by shown position, Enter goes next, and focus follows', async () => {
		const { container } = render(Quiz, { props: { questions: space() } });
		const root = container.querySelector('[data-widget="quiz"]')!;
		await fireEvent.keyDown(root, { key: '9' });
		expect(container.querySelector('[data-slot="outcome"]')).toBeNull();
		await fireEvent.keyDown(root, { key: '2' });
		expect(slot(container, 'outcome')).toBe('Correct');
		await tick();
		expect(document.activeElement?.getAttribute('data-slot')).toBe('next');
		// A digit after the pick changes nothing.
		await fireEvent.keyDown(root, { key: '1' });
		expect(slot(container, 'outcome')).toBe('Correct');
		await fireEvent.keyDown(root, { key: 'Enter' });
		expect(slot(container, 'position')).toBe('Question 2 of 3');
		await tick();
		expect(document.activeElement?.getAttribute('data-slot')).toBe('prompt');
		// Enter before a pick does not skip the question.
		await fireEvent.keyDown(root, { key: 'Enter' });
		expect(slot(container, 'position')).toBe('Question 2 of 3');
	});

	it('Enter on a focused choice answers it once; arrows only browse', async () => {
		const { container } = render(Quiz, { props: { questions: space() } });
		const mars = choice('Mars');
		await fireEvent.keyDown(mars, { key: 'ArrowDown' });
		await fireEvent.change(mars);
		await fireEvent.keyUp(mars, { key: 'ArrowDown' });
		expect(container.querySelector('[data-slot="outcome"]')).toBeNull();
		await fireEvent.keyDown(mars, { key: 'Enter' });
		expect(slot(container, 'outcome')).toBe('Not quite');
		expect(slot(container, 'position')).toBe('Question 1 of 3');
	});

	it('uses real radios in a named radiogroup', () => {
		render(Quiz, { props: { questions: space() } });
		const group = screen.getByRole('radiogroup', { name: 'Shortest day?' });
		expect(group.querySelectorAll('input[type="radio"]')).toHaveLength(3);
		expect(choice('Earth').getAttribute('aria-keyshortcuts')).toBe('1');
	});
});

describe('quiz: the countdown', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});
	const advance = async (ms: number) => {
		await vi.advanceTimersByTimeAsync(ms);
		await tick();
	};

	it('waits for Start, counts down, and records a timeout as a miss', async () => {
		const values: QuizValue[] = [];
		const { container } = render(Quiz, { props: { questions: space(), seconds_per_question: 5, onchange: (v: QuizValue) => values.push(v) } });
		expect(screen.queryAllByRole('radio')).toHaveLength(0);
		await advance(10_000);
		expect(values).toHaveLength(0);

		await fireEvent.click(screen.getByRole('button', { name: 'Start quiz' }));
		expect(screen.getByRole('timer').getAttribute('aria-label')).toBe('5 seconds left');
		await advance(2000);
		expect(screen.getByRole('timer').getAttribute('aria-label')).toBe('3 seconds left');
		await advance(3200);
		expect(values.at(-1)).toEqual({ index: 0, answers: [null], score: 0, done: false });
		expect(slot(container, 'outcome')).toBe("Time's up");
		expect(screen.getByText("Time's up. The answer is Jupiter.")).toBeTruthy();
		expect(choice(/Jupiter/).closest('label')!.textContent).toContain('Correct answer');

		// Next restarts the clock for the next question; a pick in time stops it.
		await next();
		await advance(1000);
		expect(screen.getByRole('timer').getAttribute('aria-label')).toBe('4 seconds left');
		await pick('Proxima Centauri');
		await advance(10_000);
		expect(values.at(-1)?.answers).toEqual([null, 1]);
		await next();
		await advance(6000);
		await next();
		expect(slot(container, 'score')).toBe('Score: 1 / 3');
		expect(container.querySelector('[data-slot="review"]')!.textContent).toContain('Ran out of time');
	});
});

describe('quiz: bad data', () => {
	it('skips a question whose answer is out of range, with one warning, and plays the rest', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const questions = [
			space()[0],
			{ prompt: 'Broken one', choices: ['A', 'B'], answer: 5 },
			{ prompt: 'Negative', choices: ['A', 'B'], answer: -1 },
			...space().slice(1)
		];
		const { container } = render(Quiz, { props: { questions } });
		expect(slot(container, 'meta')).toBe('3 questions');
		expect(warn.mock.calls.filter(([m]) => String(m).includes('outside its'))).toHaveLength(2);
		expect(warn.mock.calls[0][0]).toContain('Broken one');
		await pick('Jupiter');
		await next();
		expect(screen.getByText('Closest star to the Sun?')).toBeTruthy();
	});

	it.each([
		['wrong types everywhere', { questions: 'space', seconds_per_question: 'soon', shuffle_choices: 'yes', title: 3, value: 'x' }],
		['junk rows', { questions: [null, 4, 'Q?', { prompt: 'No choices' }, { prompt: 'One', choices: ['A'], answer: 0 }, { prompt: { x: 1 }, choices: ['A', 'B'], answer: 0 }] }],
		['a junk bound value', { questions: space(), value: { index: 'far', answers: [7, 'x', {}] } }],
		['nothing at all', {}]
	])('%s renders without throwing', (_name, props) => {
		const { container } = render(Quiz, { props: props as never });
		expect(container.querySelector('[data-widget="quiz"]')).not.toBeNull();
	});

	it('shows the empty line without questions and caps at 12', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(Quiz, { props: {} });
		expect(screen.getByText('No questions yet. Ask for a quiz.')).toBeTruthy();
		cleanup();
		const many = Array.from({ length: 15 }, (_, i) => ({ prompt: `Q${i}`, choices: ['A', 'B'], answer: 0 }));
		const { container } = render(Quiz, { props: { questions: many } });
		expect(slot(container, 'meta')).toBe('12 questions');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('first 12'));
	});
});

describe('quiz: a re-sent spec', () => {
	const spec = (questions: QuizItem[] = space()) => ({ state: {}, ui: { type: 'quiz', bind: '{state.quiz}', props: { questions } } });

	it('keeps the progress when the same spec comes back; new questions start over', async () => {
		const { container, rerender } = render(Ripple, { props: { spec: spec() } });
		await pick('Jupiter');
		await next();
		await pick('Sirius');

		await rerender({ spec: spec() });
		expect(slot(container, 'position')).toBe('Question 2 of 3');
		expect(slot(container, 'outcome')).toBe('Not quite');
		expect(marks(container)).toEqual(['right', 'wrong', 'todo']);

		await rerender({ spec: spec([{ prompt: 'A new one', choices: ['Yes', 'No'], answer: 0 }, ...space()]) });
		expect(slot(container, 'position')).toBe('Question 1 of 4');
		expect(marks(container)).toEqual(['now', 'todo', 'todo', 'todo']);
	});

	it('keeps progress when an empty initial value is re-sent, and works unbound', async () => {
		const withInit = { state: { quiz: { index: 0, answers: [], score: 0, done: false } }, ui: { type: 'quiz', bind: '{state.quiz}', props: { questions: space() } } };
		const { container, rerender } = render(Ripple, { props: { spec: withInit } });
		await pick('Jupiter');
		await next();
		await rerender({ spec: structuredClone(withInit) });
		expect(slot(container, 'position')).toBe('Question 2 of 3');
		cleanup();

		const unbound = () => ({ ui: { type: 'quiz', props: { questions: space() } } });
		const r = render(Ripple, { props: { spec: unbound() } });
		await pick('Mars');
		await r.rerender({ spec: unbound() });
		expect(slot(r.container, 'outcome')).toBe('Not quite');
	});

	it('resumes from a bound value the host set', () => {
		const { container } = render(Ripple, {
			props: { spec: { state: { quiz: { index: 2, answers: [1, 0] } }, ui: { type: 'quiz', bind: '{state.quiz}', props: { questions: space() } } } }
		});
		expect(slot(container, 'position')).toBe('Question 3 of 3');
		expect(marks(container)).toEqual(['right', 'wrong', 'now']);
	});
});

describe('quiz: streaming', () => {
	it('streams id-less, partial and broken questions, timed and shuffled, and ends equal to the whole render', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		await expectStreamParity({
			ui: {
				type: 'quiz',
				bind: '{state.quiz}',
				props: {
					title: 'Space trivia',
					topic: 'Astronomy',
					seconds_per_question: 20,
					shuffle_choices: true,
					questions: [
						{ prompt: 'Which planet has the shortest day?', choices: ['Earth', 'Jupiter', 'Mars', 'Venus'], answer: 1, why: 'Under 10 hours.' },
						{},
						{ prompt: 'Out of range', choices: ['A', 'B'], answer: 4 },
						{ prompt: 'Closest star?', choices: ['Sirius', 'Proxima Centauri'], answer: 1 },
						{ prompt: 'Red planet?', choices: ['Mars', 'Venus', 'Mercury'], answer: 0, image: 'https://example.com/mars.jpg' }
					]
				}
			}
		});
		cleanup();
		await expectStreamParity({ ui: { type: 'quiz', props: { title: 'Untimed', questions: space() } } });
	});
});
