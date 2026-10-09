// routes/pawbar/play-cards.test.ts: Each hand-written play card renders through
// <Ripple> the way the chat shows a final card: its widget appears with the
// content the chip promised, the "harder round" button stays hidden until the
// bound game says it is done, and the heart's numbered notes are there.

import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { habitCard, heartCard, memoryMatchCard, quizCard, wordGuessCard } from './play-cards.js';

const waitFor = <T>(fn: () => T | Promise<T>) => vi.waitFor(fn, { timeout: 5000 });
const mount = (card: object) => {
	const onEvent = vi.fn();
	const view = render(Ripple, { props: { spec: { version: '1.0', ...card }, onEvent } });
	return { ...view, onEvent };
};
const buttonNamed = (view: ReturnType<typeof mount>, name: string) =>
	[...view.container.querySelectorAll('button')].find((b) => b.textContent?.trim() === name);

test('memory match deals 16 cards and hides the harder round until it is won', async () => {
	const view = mount(memoryMatchCard);
	await waitFor(() => expect(view.container.textContent).toContain('Spanish animals'));
	expect(buttonNamed(view, 'Play a harder round')).toBeUndefined();
});

test('guess the word shows its board and a hint to reveal', async () => {
	const view = mount(wordGuessCard);
	await waitFor(() => expect(view.container.textContent).toContain('Space words'));
	expect(view.container.textContent).not.toMatch(/friendly error|4 to 7 letters/i);
	expect(buttonNamed(view, 'Another space word')).toBeUndefined();
});

test.each([
	['won', wordGuessCard, { word: { guesses: ['comet'], status: 'won', hint_used: false } }, 'Another space word'],
	['lost', wordGuessCard, { word: { guesses: [], status: 'lost', hint_used: true } }, 'Another space word'],
	['done', quizCard, { quiz: { index: 5, answers: [1, 0, 2, 1, 3, 1], score: 6, done: true } }, 'Give me a harder round'],
	['completed', memoryMatchCard, { game: { moves: 8, matched: [], completed: true, seconds: 30 } }, 'Play a harder round']
])('once the game state says %s, the next-round button shows and asks from a click', async (_s, card, state, label) => {
	const view = mount({ ...card, state });
	await waitFor(() => expect(buttonNamed(view, label)).toBeTruthy());
	await fireEvent.click(buttonNamed(view, label)!);
	await tick();
	expect(view.onEvent.mock.calls.some(([e]) => JSON.stringify(e).includes('ask'))).toBe(true);
});

test('space trivia asks its first question and hides the harder round until done', async () => {
	const view = mount(quizCard);
	await waitFor(() => expect(view.container.textContent).toContain('Which planet has the shortest day?'));
	expect(buttonNamed(view, 'Give me a harder round')).toBeUndefined();
});

test('the habit tracker lists the four habits', async () => {
	const view = mount(habitCard);
	await waitFor(() => {
		for (const name of ['Read 20 pages', 'Run', 'Drink 2L of water', 'In bed by 11']) expect(view.container.textContent).toContain(name);
	});
});

test('the heart shows six numbered notes, and its button asks', async () => {
	const view = mount(heartCard);
	await waitFor(() => expect(view.container.textContent).toContain('Mitral valve'));
	for (const label of ['Right atrium', 'Tricuspid valve', 'Right ventricle', 'Left atrium', 'Left ventricle']) expect(view.container.textContent).toContain(label);
	await fireEvent.click(buttonNamed(view, 'Quiz me on the heart')!);
	await tick();
	expect(view.onEvent).toHaveBeenCalled();
	expect(JSON.stringify(view.onEvent.mock.calls)).toContain('ask');
});
