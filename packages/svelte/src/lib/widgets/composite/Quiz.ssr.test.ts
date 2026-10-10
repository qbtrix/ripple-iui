// widgets/composite/Quiz.ssr.test.ts — quiz renders through svelte/server (the
// showcase is prerendered): the first question and its choices, a timed quiz's
// Start screen, a resumed bound value, and a shuffled order equal to the client's.
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Quiz from './Quiz.svelte';
import { shuffled } from './FlashcardDeck.svelte';

const questions = [
	{ prompt: 'Shortest day?', choices: ['Earth', 'Jupiter', 'Mars', 'Venus'], answer: 1 },
	{ prompt: 'Closest star?', choices: ['Sirius', 'Proxima Centauri'], answer: 1 }
];

describe('quiz SSR', () => {
	it('renders the first question, its choices and the position', () => {
		const { body } = render(Quiz, { props: { title: 'Space trivia', questions } });
		expect(body).toContain('Space trivia');
		expect(body).toMatch(/data-slot="prompt"[^>]*>Shortest day\?</);
		expect(body.match(/type="radio"/g)).toHaveLength(4);
		expect(body).toMatch(/data-slot="position"[^>]*>Question 1 of 2</);
	});

	it('renders a timed quiz at its Start screen', () => {
		const { body } = render(Quiz, { props: { questions, seconds_per_question: 15 } });
		expect(body).toContain('Start quiz');
		expect(body).not.toContain('type="radio"');
	});

	it('renders a bound value mid-quiz', () => {
		const { body } = render(Quiz, { props: { questions, value: { index: 1, answers: [1], score: 1, done: false } } });
		expect(body).toMatch(/data-slot="position"[^>]*>Question 2 of 2</);
	});

	it('deals the same shuffled order the client will', () => {
		const q = questions[0];
		const want = shuffled([0, 1, 2, 3], `0|${q.prompt}|${q.choices.join('|')}`);
		const { body } = render(Quiz, { props: { questions, shuffle_choices: true } });
		const got = [...body.matchAll(/data-choice="(\d)"/g)].map((m) => Number(m[1]));
		expect(got).toEqual(want);
	});
});
