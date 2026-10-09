// widgets/composite/FlashcardDeck.test.ts — the flashcard-deck data widget:
// registry and bind-contract wiring, score written back to state, on_complete
// reaching the host, streamed parity (with shuffle on), junk props, and the
// deck's own logic (flip, marks, the score screen, practise-missed re-deal,
// restart, hints, the seeded shuffle).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget, hasWidget } from '../index.js';
import { _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import FlashcardDeck, { shuffled, type DeckCard } from './FlashcardDeck.svelte';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const TYPES = ['flashcard-deck', 'flashcards', 'study-deck', 'flip-cards'];
const spanish = (): DeckCard[] => [
	{ id: 'hola', front: 'Hello', back: 'Hola', category: 'Greetings' },
	{ id: 'gracias', front: 'Thank you', back: 'Gracias', hint: 'Starts with G' },
	{ id: 'agua', front: 'Water', back: 'Agua' }
];
const btn = (name: string | RegExp) => screen.getByRole('button', { name });
const slot = (c: HTMLElement, s: string) => c.querySelector(`[data-slot="${s}"]`)?.textContent?.replace(/\s+/g, ' ').trim();

describe('flashcard-deck: registry and bind contract', () => {
	it('resolves the type and every alias to one component', () => {
		for (const t of TYPES) {
			expect(hasWidget(t)).toBe(true);
			expect(getWidget(t)).toBe(getWidget('flashcard-deck'));
		}
		expect(getWidget('flashcard')).not.toBe(getWidget('flashcard-deck'));
	});

	it('binds score through onscorechange, for every alias, without the unregistered warning', () => {
		for (const t of TYPES) expect(getBindContract(t)).toEqual({ prop: 'score', event: 'onscorechange' });
		_resetBindContractWarnings();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		for (const t of TYPES) warnUnregisteredBindContract(t);
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('flashcard-deck: through Ripple', () => {
	it('writes score to state and sends on_complete with { score, total }', async () => {
		const onStateChange = vi.fn();
		const onEvent = vi.fn();
		render(Ripple, {
			props: {
				spec: {
					state: { score: 0 },
					ui: { type: 'flashcard-deck', bind: '{state.score}', props: { cards: spanish() }, on_complete: { action: 'emit', target: 'deck-done' } }
				},
				onStateChange,
				onEvent
			}
		});
		await fireEvent.click(btn('Got it'));
		expect(onStateChange).toHaveBeenLastCalledWith('score', 1, expect.anything());
		await fireEvent.click(btn('Missed it'));
		expect(onStateChange).toHaveBeenCalledTimes(1);
		await fireEvent.click(btn('Got it'));
		expect(onStateChange).toHaveBeenLastCalledWith('score', 2, expect.anything());

		await vi.waitFor(() => expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'emit' })));
		const emit = onEvent.mock.calls.map(([e]) => e).find((e) => e?.type === 'emit');
		expect(emit.payload).toEqual({ score: 2, total: 3 });
	});
});

describe('flashcard-deck: streaming', () => {
	it('streams id-less, field-less and back-less cards, shuffled, and ends equal to the whole render', async () => {
		await expectStreamParity({
			ui: {
				type: 'flashcard-deck',
				props: {
					title: 'Beginner Spanish',
					shuffle: true,
					cards: [
						{ front: 'Hello', back: 'Hola', category: 'Greetings' },
						{},
						{ front: 'Thank you', back: 'Gracias' },
						{ front: 'Water' },
						{ front: 'Friend', back: 'Amigo / Amiga', hint: 'Ends in o or a' },
						{ front: 'Friend', back: 'Amigo / Amiga' }
					]
				}
			}
		});
	});
});

describe('flashcard-deck: junk props', () => {
	it.each([
		['wrong types everywhere', { cards: 'hola', shuffle: 'yes', score: 'many', title: 3 }],
		['junk rows', { cards: [null, 4, 'Hola', { back: 'no front' }, { front: { x: 1 } }, { front: '**Bold**', back: 7 }] }],
		['nothing at all', {}]
	])('%s renders without throwing', (_name, props) => {
		const { container } = render(FlashcardDeck, { props: props as never });
		expect(container.querySelector('[data-widget="flashcard-deck"]')).not.toBeNull();
	});

	it('shows the empty line without cards', () => {
		render(FlashcardDeck, { props: {} });
		expect(screen.getByText('No cards yet. Ask for a deck.')).toBeTruthy();
	});

	it('strips markdown and fills a missing answer', () => {
		const { container } = render(FlashcardDeck, { props: { cards: [{ front: '**Bold**' }] as never } });
		expect(slot(container, 'front')).toBe('Bold');
		expect(slot(container, 'back')).toBe('No answer given');
	});
});

describe('flashcard-deck: the deck', () => {
	it('flips, marks, and moves the dots and the position on', async () => {
		const { container } = render(FlashcardDeck, { props: { cards: spanish() } });
		const card = container.querySelector('[data-flipped]')!;
		expect(card.getAttribute('data-flipped')).toBe('false');
		expect(btn(/Hello/)).toBeTruthy();
		await fireEvent.click(card);
		expect(card.getAttribute('data-flipped')).toBe('true');
		expect(slot(container, 'back')).toBe('Hola');

		await fireEvent.click(btn('Missed it'));
		// A fresh node, not the old one rotating back over the next answer.
		expect(container.querySelector('[data-flipped]')).not.toBe(card);
		expect(container.querySelector('[data-flipped]')!.getAttribute('data-flipped')).toBe('false');
		expect(slot(container, 'front')).toBe('Thank you');
		expect(slot(container, 'position')).toBe('2 / 3');
		expect([...container.querySelectorAll('[data-mark]')].map((d) => d.getAttribute('data-mark'))).toEqual(['missed', 'now', 'todo']);
		expect(slot(container, 'tally')).toBe('0 got it · 1 missed · 2 left');
	});

	it('scores the pass, re-deals only the missed cards, and restarts', async () => {
		const scores: number[] = [];
		const done: unknown[] = [];
		const { container } = render(FlashcardDeck, {
			props: { cards: spanish(), onscorechange: (s: number) => scores.push(s), oncomplete: (r: unknown) => done.push(r) }
		});
		await fireEvent.click(btn('Got it'));
		await fireEvent.click(btn('Missed it'));
		await fireEvent.click(btn('Missed it'));

		expect(slot(container, 'total')).toBe('1 / 3');
		expect(done).toEqual([{ score: 1, total: 3 }]);
		const missed = container.querySelector('[data-slot="missed"]')!.textContent;
		expect(missed).toContain('Thank you');
		expect(missed).toContain('Agua');
		expect(missed).not.toContain('Hello');

		await fireEvent.click(btn('Practise missed (2)'));
		expect(slot(container, 'position')).toBe('1 / 2');
		expect(slot(container, 'meta')).toBe('3 cards · practising 2 missed');
		expect(slot(container, 'front')).toBe('Thank you');
		await fireEvent.click(btn('Got it'));
		await fireEvent.click(btn('Got it'));

		expect(slot(container, 'total')).toBe('3 / 3');
		expect(screen.getByText('This round: 2 of 2')).toBeTruthy();
		expect(screen.getByText('Every card known.')).toBeTruthy();
		expect(screen.queryByRole('button', { name: /Practise missed/ })).toBeNull();
		expect(scores).toEqual([1, 2, 3]);
		expect(done).toEqual([{ score: 1, total: 3 }, { score: 3, total: 3 }]);

		await fireEvent.click(btn('Restart'));
		expect(scores.at(-1)).toBe(0);
		expect(slot(container, 'position')).toBe('1 / 3');
		expect(slot(container, 'meta')).toBe('3 cards');
	});

	it('shows a hint on request and hides it on the next card', async () => {
		const { container } = render(FlashcardDeck, { props: { cards: spanish() } });
		expect(screen.queryByRole('button', { name: 'Show hint' })).toBeNull();
		await fireEvent.click(btn('Got it'));
		await fireEvent.click(btn('Show hint'));
		expect(slot(container, 'hint')).toBe('Starts with G');
		await fireEvent.click(btn('Got it'));
		expect(container.querySelector('[data-slot="hint"]')).toBeNull();
	});

	it('shuffles with a seed: a stable permutation, the same order on every mount', () => {
		const ids = Array.from({ length: 12 }, (_, i) => i);
		const a = shuffled(ids, 'seed');
		expect(shuffled(ids, 'seed')).toEqual(a);
		expect(a.toSorted((x, y) => x - y)).toEqual(ids);
		expect(a).not.toEqual(ids);
		expect(shuffled(ids, 'other')).not.toEqual(a);

		const cards = Array.from({ length: 8 }, (_, i) => ({ front: `Card ${i}`, back: `${i}` }));
		const first = render(FlashcardDeck, { props: { cards, shuffle: true } });
		const front1 = slot(first.container, 'front');
		cleanup();
		const second = render(FlashcardDeck, { props: { cards, shuffle: true } });
		expect(slot(second.container, 'front')).toBe(front1);
	});
});
