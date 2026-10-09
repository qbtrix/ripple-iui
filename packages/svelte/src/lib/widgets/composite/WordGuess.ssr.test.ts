// widgets/composite/WordGuess.ssr.test.ts — word-guess renders through
// svelte/server (the showcase is prerendered): the empty board sized to the
// answer, the keyboard, the hint button, and the friendly error for a bad answer.
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import WordGuess from './WordGuess.svelte';

describe('word-guess SSR', () => {
	it('renders the board, the keyboard and the hint button on the server', () => {
		const { body } = render(WordGuess, { props: { title: 'Kitchen words', answer: 'whisk', hint: 'You beat eggs with it', max_guesses: 4 } });
		expect(body).toContain('Kitchen words');
		expect(body).toMatch(/data-slot="meta"[^>]*>\s*5 letters · 4 guesses/);
		expect(body.match(/data-row="/g)).toHaveLength(4);
		expect(body.match(/data-key="/g)).toHaveLength(26);
		expect(body).toContain('Show hint');
		expect(body).not.toContain('You beat eggs with it');
		expect(body).not.toContain('WHISK');
	});

	it('renders the inline error for a bad answer', () => {
		const { body } = render(WordGuess, { props: { answer: 'r2d2' } });
		expect(body).toContain('This puzzle needs a 4 to 7 letter answer, A to Z only.');
		expect(body).not.toContain('data-slot="board"');
	});
});
