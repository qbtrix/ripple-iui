// widgets/composite/WordGuess.test.ts — the word-guess data widget: the
// scoring table (duplicate letters included), registry and bind-contract
// wiring, value and on_complete through Ripple, physical and on-screen
// keyboard input, win, lose, hint, answer validation, re-send and answer
// change, the share grid on the clipboard, and streamed parity.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget, hasWidget } from '../index.js';
import { DEFAULT_BIND_CONTRACT, _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import WordGuess, { keyStates, parseAnswer, score, shareText, type Feedback } from './WordGuess.svelte';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const TYPES = ['word-guess', 'guess-the-word', 'word-game'];
const board = (c: HTMLElement) => c.querySelector('[data-slot="board"]') as HTMLElement;
const slot = (c: HTMLElement, s: string) => c.querySelector(`[data-slot="${s}"]`)?.textContent?.replace(/\s+/g, ' ').trim();
const rowStates = (c: HTMLElement, r: number) =>
	[...c.querySelectorAll('[data-slot="grid"] > li')[r].querySelectorAll('[data-state]')].map((t) => t.getAttribute('data-state'));

async function typeWord(c: HTMLElement, w: string, enter = true) {
	for (const ch of w) await fireEvent.keyDown(board(c), { key: ch });
	if (enter) await fireEvent.keyDown(board(c), { key: 'Enter' });
}

const C = 'correct', P = 'present', A = 'absent';
describe('word-guess: scoring', () => {
	it.each<[string, string, Feedback[]]>([
		['CRANE', 'CRANE', [C, C, C, C, C]],
		['CRANE', 'TOILS', [A, A, A, A, A]],
		['CRANE', 'NACRE', [P, P, P, P, C]],
		// Two Es on each side, neither in place: both are credited as in word.
		['SPEED', 'ERASE', [P, A, A, P, P]],
		['ABBEY', 'KEBAB', [A, P, C, P, P]],
		// Two Es in the answer, three in the guess: two get credit, the third is absent.
		['SPEED', 'EERIE', [P, P, A, A, A]],
		['THOSE', 'GEESE', [A, A, A, C, C]],
		// The exact match is credited before an earlier copy can take it.
		['ROBOT', 'OOOOO', [A, C, A, C, A]],
		['ALLEY', 'LLAMA', [P, C, P, A, A]],
		['WORD', 'DROW', [P, P, P, P]],
		['LETTERS', 'TTTTTTT', [A, A, C, C, A, A, A]]
	])('%s vs %s', (answer, guess, expected) => {
		expect(score(guess, answer)).toEqual(expected);
	});

	it('keeps each key at its best state across guesses', () => {
		expect(keyStates(['NACRE', 'CRANE'], 'CRANE')).toMatchObject({ C: C, R: C, A: C, N: C, E: C });
		expect(keyStates(['TOILS', 'STALE'], 'CRANE')).toMatchObject({ T: A, S: A, A: C, E: C, L: A });
		expect(keyStates(['ERASE', 'SPEED'], 'SPEED')).toMatchObject({ E: C, S: C, R: A, A: A });
	});

	it('validates the answer', () => {
		expect(parseAnswer('crane')).toEqual({ word: 'CRANE' });
		expect(parseAnswer('  Whisk ')).toEqual({ word: 'WHISK' });
		for (const bad of ['cat', 'abcdefgh', 'café', 'ice cream', 'r2d2x', 42, null, undefined, ''])
			expect(parseAnswer(bad).word).toBe('');
	});

	it('builds a plain-text share grid without the answer', () => {
		const text = shareText({ title: 'Word guess', guesses: ['NACRE', 'CRANE'], answer: 'CRANE', max: 6, won: true, hintUsed: true });
		expect(text).toBe('Word guess 2/6 (hint)\n🟨🟨🟨🟨🟩\n🟩🟩🟩🟩🟩');
		expect(shareText({ title: 'W', guesses: ['TOILS'], answer: 'CRANE', max: 1, won: false, hintUsed: false })).toBe('W X/1\n⬜⬜⬜⬜⬜');
	});
});

describe('word-guess: registry and bind contract', () => {
	it('resolves the type and every alias to one component', () => {
		for (const t of TYPES) {
			expect(hasWidget(t)).toBe(true);
			expect(getWidget(t)).toBe(getWidget('word-guess'));
		}
	});

	it('binds value through onchange, for every alias, without the unregistered warning', () => {
		for (const t of TYPES) expect(getBindContract(t)).toEqual(DEFAULT_BIND_CONTRACT);
		_resetBindContractWarnings();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		for (const t of TYPES) warnUnregisteredBindContract(t);
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('word-guess: through Ripple', () => {
	const spec = (answer = 'crane') => ({
		state: { game: null },
		ui: { type: 'word-guess', bind: '{state.game}', props: { answer, hint: 'A bird' }, on_complete: { action: 'emit', target: 'game-done' } }
	});

	it('writes value to state and sends on_complete once with { won, guesses }', async () => {
		const onStateChange = vi.fn();
		const onEvent = vi.fn();
		const { container } = render(Ripple, { props: { spec: spec(), onStateChange, onEvent } });
		await typeWord(container, 'nacre');
		expect(onStateChange).toHaveBeenLastCalledWith('game', { guesses: ['NACRE'], status: 'playing', hint_used: false }, expect.anything());
		await fireEvent.click(screen.getByRole('button', { name: 'Show hint' }));
		expect(onStateChange).toHaveBeenLastCalledWith('game', { guesses: ['NACRE'], status: 'playing', hint_used: true }, expect.anything());
		await typeWord(container, 'crane');
		expect(onStateChange).toHaveBeenLastCalledWith('game', { guesses: ['NACRE', 'CRANE'], status: 'won', hint_used: true }, expect.anything());

		await vi.waitFor(() => expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'emit' })));
		await typeWord(container, 'crane');
		await tick();
		const emits = onEvent.mock.calls.map(([e]) => e).filter((e) => e?.type === 'emit');
		expect(emits).toHaveLength(1);
		expect(emits[0].payload).toEqual({ won: true, guesses: ['NACRE', 'CRANE'] });
	});

	it('a re-sent copy of the same spec keeps the progress; a new answer resets the game', async () => {
		const { container, rerender } = render(Ripple, { props: { spec: spec() } });
		await typeWord(container, 'nacre');
		await typeWord(container, 'cr', false);

		await rerender({ spec: spec() });
		expect(rowStates(container, 0)).toEqual([P, P, P, P, C]);
		expect(rowStates(container, 1)).toEqual(['typed', 'typed', 'empty', 'empty', 'empty']);

		await rerender({ spec: spec('whisk') });
		expect(rowStates(container, 0)).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
		expect(screen.getByRole('button', { name: 'Show hint' })).toBeTruthy();
	});
});

describe('word-guess: play', () => {
	it('types with the physical keyboard, deletes with Backspace, and reveals feedback on Enter', async () => {
		const { container } = render(WordGuess, { props: { answer: 'speed' } });
		await typeWord(container, 'erasx', false);
		await fireEvent.keyDown(board(container), { key: 'Backspace' });
		await fireEvent.keyDown(board(container), { key: '1' });
		await fireEvent.keyDown(board(container), { key: 'e', ctrlKey: true });
		await typeWord(container, 'e');
		expect(rowStates(container, 0)).toEqual([P, A, A, P, P]);
		expect(screen.getAllByRole('img', { name: 'E, in word' })).toHaveLength(2);
		expect(screen.getByRole('img', { name: 'R, not in word' })).toBeTruthy();
		expect(slot(container, 'announce')).toBe('Guess 1 of 6, ERASE: E in word, R not in word, A not in word, S in word, E in word.');
		// The row just played flips; the keys show each letter's best state.
		expect(container.querySelectorAll('.wg-flip')).toHaveLength(5);
		expect(container.querySelector('[data-key="R"]')!.getAttribute('data-state')).toBe(A);
		expect(screen.getByRole('button', { name: 'E, in word' })).toBeTruthy();
		expect(container.querySelector('[data-key="Q"]')!.getAttribute('data-state')).toBe('unused');
	});

	it('plays with the on-screen keyboard, and Enter on a focused key is that key, not a submit', async () => {
		const { container } = render(WordGuess, { props: { answer: 'word' } });
		for (const k of 'DROW') await fireEvent.click(container.querySelector(`[data-key="${k}"]`)!);
		const w = container.querySelector('[data-key="W"]') as HTMLElement;
		await fireEvent.keyDown(w, { key: 'Enter' });
		expect(rowStates(container, 0)).toEqual(['typed', 'typed', 'typed', 'typed']);
		await fireEvent.click(screen.getByRole('button', { name: 'Delete letter' }));
		await fireEvent.click(container.querySelector('[data-key="W"]')!);
		await fireEvent.click(screen.getByRole('button', { name: 'Enter' }));
		expect(rowStates(container, 0)).toEqual([P, P, P, P]);
	});

	it('shakes and explains a short guess without using a row', async () => {
		const { container } = render(WordGuess, { props: { answer: 'crane' } });
		await typeWord(container, 'cra');
		expect(slot(container, 'notice')).toBe('Not enough letters. The word has 5.');
		expect(slot(container, 'announce')).toBe('Not enough letters. The word has 5.');
		expect(container.querySelector('[data-row="typing"]')!.classList.contains('wg-shake')).toBe(true);
		expect(container.querySelectorAll('[data-row="played"]')).toHaveLength(0);
		await fireEvent.keyDown(board(container), { key: 'n' });
		expect(container.querySelector('.wg-shake')).toBeNull();
		expect(slot(container, 'notice')).toBeUndefined();
	});

	it('wins: end screen, answer, focus, share grid copied, and no more typing', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		const done = vi.fn();
		const { container } = render(WordGuess, { props: { answer: 'Crane', title: 'Birds', oncomplete: done } });
		await typeWord(container, 'nacre');
		await typeWord(container, 'crane');
		await tick();
		expect(slot(container, 'result')).toBe('Solved in 2');
		expect(slot(container, 'answer')).toBe('CRANE');
		expect(document.activeElement).toBe(container.querySelector('[data-slot="result"]'));
		expect(slot(container, 'announce')).toContain('Solved in 2.');
		expect(container.querySelector('[data-slot="keyboard"]')).toBeNull();
		expect(done).toHaveBeenCalledTimes(1);
		expect(done).toHaveBeenCalledWith({ won: true, guesses: ['NACRE', 'CRANE'] });

		await fireEvent.click(screen.getByRole('button', { name: 'Copy result' }));
		await tick();
		expect(writeText).toHaveBeenCalledWith('Birds 2/6\n🟨🟨🟨🟨🟩\n🟩🟩🟩🟩🟩');
		expect(slot(container, 'copied')).toBe('Copied');

		await typeWord(container, 'crane');
		expect(done).toHaveBeenCalledTimes(1);
		expect(container.querySelectorAll('[data-row="played"]')).toHaveLength(2);
		Reflect.deleteProperty(navigator, 'clipboard');
	});

	it('loses after max_guesses, shows the answer, and fires on_complete once', async () => {
		const done = vi.fn();
		const values: unknown[] = [];
		const { container } = render(WordGuess, { props: { answer: 'crane', max_guesses: 2, oncomplete: done, onchange: (v: unknown) => values.push(v) } });
		expect(container.querySelectorAll('[data-slot="grid"] > li')).toHaveLength(2);
		await typeWord(container, 'toils');
		await typeWord(container, 'stale');
		expect(slot(container, 'result')).toBe('Out of guesses');
		expect(slot(container, 'answer')).toBe('CRANE');
		expect(slot(container, 'share')).toBe('Word guess X/2 ⬜⬜⬜⬜⬜ ⬜⬜🟩⬜🟩');
		expect(slot(container, 'announce')).toContain('Out of guesses. The word was CRANE.');
		expect(done).toHaveBeenCalledTimes(1);
		expect(done).toHaveBeenCalledWith({ won: false, guesses: ['TOILS', 'STALE'] });
		expect(values.at(-1)).toEqual({ guesses: ['TOILS', 'STALE'], status: 'lost', hint_used: false });
	});

	it('reveals the hint, counts it, and moves focus to it', async () => {
		const values: unknown[] = [];
		const { container } = render(WordGuess, { props: { answer: 'whisk', hint: 'You beat eggs with it', onchange: (v: unknown) => values.push(v) } });
		await fireEvent.click(screen.getByRole('button', { name: 'Show hint' }));
		await tick();
		expect(slot(container, 'hint')).toBe('You beat eggs with it');
		expect(document.activeElement).toBe(container.querySelector('[data-slot="hint"]'));
		expect(screen.queryByRole('button', { name: 'Show hint' })).toBeNull();
		expect(values).toEqual([{ guesses: [], status: 'playing', hint_used: true }]);
	});

	it('has no hint button without a hint', () => {
		render(WordGuess, { props: { answer: 'whisk' } });
		expect(screen.queryByRole('button', { name: 'Show hint' })).toBeNull();
	});
});

describe('word-guess: bad props', () => {
	it.each([
		['too short', { answer: 'cat' }],
		['too long', { answer: 'elephants' }],
		['non-letters', { answer: 'r2-d2' }],
		['accented', { answer: 'café' }],
		['a number', { answer: 12345 }],
		['wrong types everywhere', { answer: ['crane'], hint: { x: 1 }, max_guesses: 'lots', title: 3 }]
	])('%s shows a friendly inline error, no board', (_name, props) => {
		const { container } = render(WordGuess, { props: props as never });
		expect(container.querySelector('[data-widget="word-guess"]')).not.toBeNull();
		expect(slot(container, 'invalid')).toMatch(/needs a 4 to 7 letter answer|No puzzle yet/);
		expect(container.querySelector('[data-slot="board"]')).toBeNull();
		expect(container.querySelector('[role="alert"]')).toBeNull();
	});

	it('asks for a puzzle with no answer at all', () => {
		const { container } = render(WordGuess, { props: {} });
		expect(slot(container, 'invalid')).toBe('No puzzle yet.');
	});

	it('clamps max_guesses', () => {
		const { container } = render(WordGuess, { props: { answer: 'crane', max_guesses: 99 } });
		expect(container.querySelectorAll('[data-slot="grid"] > li')).toHaveLength(10);
	});
});

describe('word-guess: streaming', () => {
	it('streams a partial answer and hint and ends equal to the whole render', async () => {
		await expectStreamParity({
			ui: { type: 'word-guess', props: { title: 'Kitchen words', answer: 'whisk', hint: 'You beat eggs with it', max_guesses: 5 } }
		});
	});
});
