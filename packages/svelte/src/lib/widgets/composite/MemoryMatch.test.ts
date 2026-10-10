// widgets/composite/MemoryMatch.test.ts — the memory-match play widget:
// registry and bind contract, the game through Ripple (bound value and one
// on_complete), a stable deal across a re-sent spec, match and miss timing,
// the clock and time limit, keyboard play, icon keys, streamed parity and junk
// props.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget, hasWidget } from '../index.js';
import { _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import MemoryMatch, { autoColumns, face, type MatchPair } from './MemoryMatch.svelte';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const TYPES = ['memory-match', 'memory-game', 'match-pairs'];
const animals = (): MatchPair[] => [
	{ id: 'dog', a: 'perro', b: 'dog' },
	{ id: 'cat', a: 'gato', b: 'cat' },
	{ id: 'horse', a: 'caballo', b: 'horse' },
	{ id: 'bird', a: 'pájaro', b: 'bird' },
	{ id: 'fish', a: 'pez', b: 'fish' },
	{ id: 'cow', a: 'vaca', b: 'cow' }
];

const cardsIn = (c: Element) => [...c.querySelectorAll<HTMLButtonElement>('[data-pos]')];
const text = (b: Element) => b.querySelector('.mm-front')?.textContent?.trim() ?? '';
/** Positions of each pair, keyed by pair id, read from the faces in the DOM. */
function layout(c: Element, pairs: MatchPair[]) {
	const at = new Map<string, number[]>();
	cardsIn(c).forEach((b, pos) => {
		const id = pairs.find((x) => x.a === text(b) || x.b === text(b))?.id ?? '';
		at.set(id, [...(at.get(id) ?? []), pos]);
	});
	return at;
}
const card = (c: Element, pos: number) => c.querySelector<HTMLButtonElement>(`[data-pos="${pos}"]`)!;
const slot = (c: Element, s: string) => c.querySelector(`[data-slot="${s}"]`)?.textContent?.replace(/\s+/g, ' ').trim();
const advance = async (ms: number) => {
	await vi.advanceTimersByTimeAsync(ms);
	await tick();
};
const stat = (label: string) => screen.getByText(label).closest('div')!.parentElement!.textContent!.replace(/\s+/g, ' ').trim();

describe('memory-match: registry and bind contract', () => {
	it('resolves the type and every alias to one component', () => {
		for (const t of TYPES) {
			expect(hasWidget(t)).toBe(true);
			expect(getWidget(t)).toBe(getWidget('memory-match'));
		}
	});

	it('binds value through onchange, for every alias, without the unregistered warning', () => {
		for (const t of TYPES) expect(getBindContract(t)).toEqual({ prop: 'value', event: 'onchange' });
		_resetBindContractWarnings();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		for (const t of TYPES) warnUnregisteredBindContract(t);
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('memory-match: through Ripple', () => {
	it('writes value to state on each move and sends on_complete once with { moves, seconds }', async () => {
		const onStateChange = vi.fn();
		const onEvent = vi.fn();
		const pairs = animals();
		const { container } = render(Ripple, {
			props: {
				spec: {
					state: { game: null },
					ui: { type: 'memory-match', bind: '{state.game}', props: { title: 'Spanish animals', pairs }, on_complete: { action: 'emit', target: 'won' } }
				},
				onStateChange,
				onEvent
			}
		});
		const at = layout(container, pairs);
		const [d0, d1] = at.get('dog')!;
		await fireEvent.click(card(container, d0));
		expect(onStateChange).not.toHaveBeenCalled();
		await fireEvent.click(card(container, d1));
		expect(onStateChange).toHaveBeenLastCalledWith('game', { moves: 1, matched: ['dog'], completed: false, seconds: 0 }, expect.anything());

		for (const id of ['cat', 'horse', 'bird', 'fish', 'cow']) {
			const [x, y] = at.get(id)!;
			await fireEvent.click(card(container, x));
			await fireEvent.click(card(container, y));
		}
		expect(onStateChange).toHaveBeenLastCalledWith(
			'game',
			{ moves: 6, matched: ['dog', 'cat', 'horse', 'bird', 'fish', 'cow'], completed: true, seconds: 0 },
			expect.anything()
		);
		await vi.waitFor(() => expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'emit' })));
		const emits = onEvent.mock.calls.map(([e]) => e).filter((e) => e?.type === 'emit');
		expect(emits).toHaveLength(1);
		expect(emits[0].payload).toEqual({ moves: 6, seconds: 0 });
		expect(slot(container, 'end')).toContain('All 6 pairs matched');
		expect(screen.getByRole('button', { name: 'Play again' })).toBeTruthy();
		await tick();
		expect(onEvent.mock.calls.filter(([e]) => e?.type === 'emit')).toHaveLength(1);
	});
});

describe('memory-match: the deal', () => {
	it('keeps the order and the play across a re-sent spec; a new deck starts over', async () => {
		const pairs = animals();
		const r = render(MemoryMatch, { props: { pairs } });
		const before = cardsIn(r.container).map(text);
		const [x, y] = layout(r.container, pairs).get('cat')!;
		await fireEvent.click(card(r.container, x));
		await fireEvent.click(card(r.container, y));

		await r.rerender({ pairs: structuredClone(pairs) });
		expect(cardsIn(r.container).map(text)).toEqual(before);
		expect(card(r.container, x).getAttribute('data-matched')).toBe('true');
		expect(stat('Moves')).toContain('1');
		expect(stat('Pairs')).toContain('1 / 6');

		await r.rerender({ pairs: pairs.map((p) => ({ ...p, b: p.b.toUpperCase() })) });
		expect(cardsIn(r.container).every((b) => b.getAttribute('data-up') === 'false')).toBe(true);
		expect(stat('Pairs')).toContain('0 / 6');
	});

	it('shuffles: the same deck deals the same order on every mount, not the input order', () => {
		const pairs = animals();
		const first = cardsIn(render(MemoryMatch, { props: { pairs } }).container).map(text);
		cleanup();
		const second = cardsIn(render(MemoryMatch, { props: { pairs } }).container).map(text);
		expect(second).toEqual(first);
		expect(first).not.toEqual(pairs.flatMap((p) => [p.a, p.b]));
		const byText = (x: string, y: string) => x.localeCompare(y);
		expect(first.toSorted(byText)).toEqual(pairs.flatMap((p) => [p.a, p.b]).toSorted(byText));
	});

	it('names every card, face down until flipped, and caps the deck at 12 pairs', async () => {
		const pairs = Array.from({ length: 14 }, (_, i) => ({ id: `p${i}`, a: `A${i}`, b: `B${i}` }));
		const { container } = render(MemoryMatch, { props: { pairs } });
		expect(cardsIn(container)).toHaveLength(24);
		expect(screen.getByRole('button', { name: 'Card 3, face down' })).toBeTruthy();
		await fireEvent.click(card(container, 2));
		expect(card(container, 2).getAttribute('aria-label')).toBe(`Card 3, ${text(card(container, 2))}`);
		expect(slot(container, 'live')).toBe(`Card 3: ${text(card(container, 2))}`);
	});

	it('picks columns by card count', () => {
		expect([12, 16, 18, 20, 22, 24].map(autoColumns)).toEqual([4, 4, 5, 5, 6, 6]);
	});
});

describe('memory-match: match, miss and the clock', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});
	it('keeps a match face up and flips a miss back after 800ms', async () => {
		const pairs = animals();
		const { container } = render(MemoryMatch, { props: { pairs } });
		const at = layout(container, pairs);
		const [d0, d1] = at.get('dog')!;
		const [c0] = at.get('cat')!;

		await fireEvent.click(card(container, d0));
		await fireEvent.click(card(container, c0));
		expect(card(container, d0).getAttribute('data-up')).toBe('true');
		expect(card(container, c0).getAttribute('data-miss')).toBe('true');
		expect(slot(container, 'live')).toMatch(/no match/);
		await advance(799);
		expect(card(container, c0).getAttribute('data-up')).toBe('true');
		await advance(1);
		expect(card(container, d0).getAttribute('data-up')).toBe('false');
		expect(card(container, c0).getAttribute('data-up')).toBe('false');

		await fireEvent.click(card(container, d0));
		await fireEvent.click(card(container, d1));
		await advance(2000);
		expect(card(container, d0).getAttribute('data-matched')).toBe('true');
		expect(card(container, d1).getAttribute('aria-label')).toMatch(/, matched$/);
		expect(slot(container, 'live')).toMatch(/^Match: .* 1 of 6 pairs found\.$/);
		expect(stat('Moves')).toContain('2');

		// A matched card ignores clicks and does not count a move.
		await fireEvent.click(card(container, d0));
		expect(stat('Moves')).toContain('2');
	});

	it('turns a showing miss back at once when a third card is flipped', async () => {
		const pairs = animals();
		const { container } = render(MemoryMatch, { props: { pairs } });
		const at = layout(container, pairs);
		const [d0] = at.get('dog')!;
		const [c0] = at.get('cat')!;
		const [h0] = at.get('horse')!;
		await fireEvent.click(card(container, d0));
		await fireEvent.click(card(container, c0));
		await fireEvent.click(card(container, h0));
		expect(card(container, d0).getAttribute('data-up')).toBe('false');
		expect(card(container, h0).getAttribute('data-up')).toBe('true');
		await advance(800);
		expect(card(container, h0).getAttribute('data-up')).toBe('true');
	});

	it('starts the clock on the first flip and ends the game at the time limit', async () => {
		const pairs = animals();
		const done = vi.fn();
		const values: unknown[] = [];
		const { container } = render(MemoryMatch, { props: { pairs, time_limit_s: 5, oncomplete: done, onchange: (v: unknown) => values.push(v) } });
		await advance(3000);
		expect(stat('Time left')).toContain('0:05');
		await fireEvent.click(card(container, 0));
		await advance(2000);
		expect(stat('Time left')).toContain('0:03');
		expect(values).toEqual([]);
		await advance(3000);
		expect(slot(container, 'end')).toContain("Time's up");
		expect(slot(container, 'live')).toMatch(/^Time's up\./);
		expect(done).not.toHaveBeenCalled();
		expect(values.at(-1)).toEqual({ moves: 0, matched: [], completed: false, seconds: 5 });
	});

	it('counts the time into the win and keeps the best moves across Play again', async () => {
		const pairs = animals();
		const done = vi.fn();
		const values: { moves: number }[] = [];
		const { container } = render(MemoryMatch, { props: { pairs, oncomplete: done, onchange: (v: { moves: number }) => values.push(v) } });
		const win = async (miss: boolean) => {
			const at = layout(container, pairs);
			if (miss) {
				await fireEvent.click(card(container, at.get('dog')![0]));
				await fireEvent.click(card(container, at.get('cat')![0]));
				await advance(800);
			}
			for (const id of pairs.map((p) => p.id!)) {
				const [x, y] = at.get(id)!;
				await fireEvent.click(card(container, x));
				await advance(1000);
				await fireEvent.click(card(container, y));
			}
		};
		await win(true);
		expect(done).toHaveBeenCalledTimes(1);
		expect(done).toHaveBeenCalledWith({ moves: 7, seconds: 6 });
		expect(slot(container, 'result')).toBe('7 moves in 0:06');
		expect(stat('Best')).toContain('7');
		await advance(5000);
		expect(slot(container, 'result')).toBe('7 moves in 0:06');

		await fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
		expect(values.at(-1)).toEqual({ moves: 0, matched: [], completed: false, seconds: 0 });
		expect(stat('Moves')).toContain('0');
		await win(false);
		expect(done).toHaveBeenCalledTimes(2);
		expect(slot(container, 'result')).toBe('6 moves in 0:06 · new best');
		expect(stat('Best')).toContain('6');
	});
});

describe('memory-match: keyboard', () => {
	it('moves a roving focus with the arrows and flips with Enter and Space', async () => {
		const user = userEvent.setup();
		const pairs = animals();
		const { container } = render(MemoryMatch, { props: { pairs } });
		expect(cardsIn(container).filter((b) => b.tabIndex === 0)).toHaveLength(1);
		await user.tab();
		expect(document.activeElement).toBe(card(container, 0));
		await user.keyboard('{ArrowRight}');
		expect(document.activeElement).toBe(card(container, 1));
		await user.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(card(container, 5));
		await user.keyboard('{ArrowUp}{ArrowUp}');
		expect(document.activeElement).toBe(card(container, 1));
		await user.keyboard('{End}');
		expect(document.activeElement).toBe(card(container, 11));
		await user.keyboard('{Home}{ArrowLeft}');
		expect(document.activeElement).toBe(card(container, 0));
		expect(card(container, 0).tabIndex).toBe(0);

		await user.keyboard('{Enter}');
		expect(card(container, 0).getAttribute('data-up')).toBe('true');
		await user.keyboard('{ArrowRight} ');
		expect(card(container, 1).getAttribute('data-up')).toBe('true');
		expect(stat('Moves')).toContain('1');
	});
});

describe('memory-match: faces', () => {
	it('resolves icon keys, shows an unknown key as text, and spots a lone emoji', () => {
		expect(face('icon:coffee')).toMatchObject({ kind: 'icon', text: 'coffee' });
		expect(face('ICON:Flight').kind).toBe('icon');
		expect(face('icon:unicorn')).toMatchObject({ kind: 'text', text: 'unicorn' });
		expect(face('🐶').kind).toBe('emoji');
		expect(face('👩‍🚀').kind).toBe('emoji');
		expect(face('🇪🇸').kind).toBe('emoji');
		expect(face('perro 🐶').kind).toBe('text');
		expect(face('42').kind).toBe('text');
	});

	it('shrinks the font for long words', () => {
		const short = face('pez').fit!;
		const long = face('hipopótamo').fit!;
		const longer = face('Rhinocerotidae').fit!;
		expect(short).toBeGreaterThan(long);
		expect(long).toBeGreaterThan(longer);
		expect(face('el oso polar del norte').fit).toBeGreaterThan(longer);
	});

	it('renders an icon card as an icon and an unknown key as its text', async () => {
		const pairs = [
			{ id: 'c', a: 'icon:coffee', b: 'café' },
			{ id: 'u', a: 'icon:unicorn', b: 'unicornio' },
			{ id: 'p', a: 'icon:flight', b: 'avión' }
		];
		const { container } = render(MemoryMatch, { props: { pairs } });
		const all = cardsIn(container);
		expect(all.filter((b) => b.querySelector('svg.mm-icon'))).toHaveLength(2);
		const unknown = all.find((b) => text(b) === 'unicorn')!;
		expect(unknown.querySelector('svg')).toBeNull();
		const coffee = all.find((b) => b.querySelector('svg.mm-icon') && !text(b))!;
		await fireEvent.click(coffee);
		expect(coffee.getAttribute('aria-label')).toMatch(/^Card \d+, (coffee|flight)$/);
		expect(container.innerHTML).not.toContain('icon:');
	});
});

describe('memory-match: streaming', () => {
	it('streams id-less and broken pairs and ends equal to the whole render', async () => {
		await expectStreamParity({
			ui: {
				type: 'memory-match',
				props: {
					title: 'Spanish animals',
					pairs: [
						{ a: 'perro', b: '🐶' },
						{},
						{ a: 'gato', b: '🐱' },
						{ a: 'caballo' },
						{ a: 'hipopótamo', b: '🦛' },
						{ a: 'pez', b: 'icon:fish' },
						{ a: 'vaca', b: '🐮' },
						{ a: 'pájaro', b: 'icon:unicorn' }
					]
				}
			}
		});
	});
});

describe('memory-match: junk props', () => {
	it.each([
		['wrong types everywhere', { pairs: 'perro', columns: 'many', time_limit_s: 'soon', title: 3 }],
		['junk rows', { pairs: [null, 4, 'perro', { a: 'no b' }, { a: { x: 1 }, b: 2 }, { a: '**Bold**', b: 7 }, { a: 'x', b: 'y' }] }],
		['nothing at all', {}]
	])('%s renders without throwing', (_name, props) => {
		const { container } = render(MemoryMatch, { props: props as never });
		expect(container.querySelector('[data-widget="memory-match"]')).not.toBeNull();
	});

	it('shows the empty line with fewer than two pairs', () => {
		render(MemoryMatch, { props: { pairs: [{ id: 'a', a: 'one', b: 'uno' }] } });
		expect(screen.getByText('No pairs yet. Ask for a matching game.')).toBeTruthy();
	});
});
