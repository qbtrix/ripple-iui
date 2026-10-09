// widgets/composite/FlashcardDeck.ssr.test.ts — flashcard-deck renders through
// svelte/server (the showcase is prerendered): the first card, both faces in
// the markup, and a shuffled deal identical to the client's.
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import FlashcardDeck, { shuffled } from './FlashcardDeck.svelte';

describe('flashcard-deck SSR', () => {
	it('renders the first card and the progress on the server', () => {
		const { body } = render(FlashcardDeck, { props: { cards: [{ front: 'Hello', back: 'Hola' }, { front: 'Water', back: 'Agua' }] } });
		expect(body).toContain('Hello');
		expect(body).toContain('Hola');
		expect(body).toMatch(/data-slot="position"[^>]*>1 \/ 2</);
	});

	it('deals the same shuffled first card the client will', () => {
		const cards = Array.from({ length: 6 }, (_, i) => ({ front: `Card ${i}`, back: `${i}` }));
		const first = shuffled([0, 1, 2, 3, 4, 5], `0|${cards.map((c) => c.front).join('|')}`)[0];
		const { body } = render(FlashcardDeck, { props: { cards, shuffle: true } });
		expect(body).toMatch(new RegExp(`data-slot="front"[^>]*>Card ${first}<`));
	});
});
