// widgets/composite/BoardGame.test.ts — the board-game play widget: registry,
// aliases and bind contract; a game through Ripple (click, the computer's
// reply after it thinks, the bound value, one on_complete); connect-four drops,
// ghost and glow; keyboard play; Rematch; a best-of series; a re-sent spec
// keeping the board; reduced motion; stream parity and junk props.
// Math.random is pinned to 0 where a game is scripted: the think pause is then
// 300ms and the easy computer always takes the first legal move.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget, hasWidget } from '../index.js';
import { _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import BoardGame, { seriesWinner } from './BoardGame.svelte';

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('svelte/motion', async (orig) => ({
	...(await orig<typeof import('svelte/motion')>()),
	prefersReducedMotion: {
		get current() {
			return motion.reduce;
		}
	}
}));

beforeEach(() => {
	motion.reduce = false;
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const TYPES = ['board-game', 'tic-tac-toe', 'connect-four'];

const cell = (c: Element, i: number) => c.querySelector<HTMLButtonElement>(`[data-pos="${i}"]`)!;
const marks = (c: Element) => [...c.querySelectorAll<HTMLButtonElement>('[data-pos]')].map((b) => b.getAttribute('data-mark') ?? '');
const slot = (c: Element, s: string) => c.querySelector(`[data-slot="${s}"]`)?.textContent?.replace(/\s+/g, ' ').trim();
const stat = (label: string) => screen.getByText(label, { selector: '*' }).closest('div')!.parentElement!.textContent!.replace(/\s+/g, ' ').trim();
const think = async () => {
	await vi.advanceTimersByTimeAsync(600);
	await tick();
};
/** Plays the scripted tic-tac-toe win: X takes 4, 3, 5 while easy O takes 0, 1. */
async function winTicTacToe(c: Element) {
	for (const i of [4, 3, 5]) {
		await fireEvent.click(cell(c, i));
		await think();
	}
}

describe('board-game: registry and bind contract', () => {
	it('resolves the type and both aliases to one component', () => {
		for (const t of TYPES) {
			expect(hasWidget(t)).toBe(true);
			expect(getWidget(t)).toBe(getWidget('board-game'));
		}
	});

	it('binds value through onchange, for every alias, without the unregistered warning', () => {
		for (const t of TYPES) expect(getBindContract(t)).toEqual({ prop: 'value', event: 'onchange' });
		_resetBindContractWarnings();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		for (const t of TYPES) warnUnregisteredBindContract(t);
		expect(warn).not.toHaveBeenCalled();
	});

	it('lets the alias pick the game when `game` is missing; `game` wins over the alias', () => {
		const one = render(Ripple, { props: { spec: { ui: { type: 'connect-four', props: {} } } } });
		expect(one.container.querySelector('[data-widget="board-game"]')?.getAttribute('data-game')).toBe('connect-four');
		expect(one.container.querySelectorAll('[data-cell]')).toHaveLength(42);
		expect(one.container.querySelectorAll('[data-pos]')).toHaveLength(7);
		cleanup();
		const two = render(Ripple, { props: { spec: { ui: { type: 'connect-four', props: { game: 'tic-tac-toe' } } } } });
		expect(two.container.querySelectorAll('[data-pos]')).toHaveLength(9);
		cleanup();
		const three = render(Ripple, { props: { spec: { ui: { type: 'tic-tac-toe', props: {} } } } });
		expect(three.container.querySelector('[data-game]')?.getAttribute('data-game')).toBe('tic-tac-toe');
	});

	it('decides a best-of series on a majority, or level when every game is played', () => {
		expect(seriesWinner({ player: 2, computer: 0, draws: 0 }, 3)).toBe('player');
		expect(seriesWinner({ player: 1, computer: 1, draws: 0 }, 3)).toBeNull();
		expect(seriesWinner({ player: 1, computer: 1, draws: 1 }, 3)).toBe('draw');
		expect(seriesWinner({ player: 0, computer: 1, draws: 2 }, 3)).toBe('computer');
		expect(seriesWinner({ player: 0, computer: 0, draws: 1 }, 1)).toBe('draw');
		expect(seriesWinner({ player: 2, computer: 2, draws: 0 }, 5)).toBeNull();
	});
});

describe('board-game: tic-tac-toe through Ripple', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.spyOn(Math, 'random').mockReturnValue(0);
	});

	it('plays a click, thinks, replies, writes value and sends on_complete once', async () => {
		const onStateChange = vi.fn();
		const onEvent = vi.fn();
		const { container } = render(Ripple, {
			props: {
				spec: {
					state: { game: null },
					ui: { type: 'board-game', bind: '{state.game}', props: { game: 'tic-tac-toe', difficulty: 'easy' }, on_complete: { action: 'emit', target: 'done' } }
				},
				onStateChange,
				onEvent
			}
		});
		expect(slot(container, 'status')).toBe('Your turn');
		expect(cell(container, 4).getAttribute('aria-label')).toBe('Row 2, column 2, empty');

		await fireEvent.click(cell(container, 4));
		expect(cell(container, 4).getAttribute('aria-label')).toBe('Row 2, column 2, X');
		expect(slot(container, 'status')).toBe('Thinking…');
		const board1 = ['', '', '', '', 'X', '', '', '', ''];
		expect(onStateChange).toHaveBeenLastCalledWith('game', { board: board1, turn: 'computer', result: null, series: { player: 0, computer: 0, draws: 0 } }, expect.anything());

		// Clicks while the computer thinks do nothing.
		await fireEvent.click(cell(container, 8));
		expect(marks(container)[8]).toBe('');

		await vi.advanceTimersByTimeAsync(299);
		expect(marks(container)[0]).toBe('');
		await vi.advanceTimersByTimeAsync(1);
		await tick();
		expect(marks(container)).toEqual(['O', '', '', '', 'X', '', '', '', '']);
		expect(slot(container, 'live')).toBe('Computer played row 1, column 1.');
		expect(slot(container, 'status')).toBe('Your turn');

		await fireEvent.click(cell(container, 3));
		await think();
		await fireEvent.click(cell(container, 5));
		expect(slot(container, 'status')).toBe('You win!');
		expect(slot(container, 'live')).toBe('You win!');
		expect(container.querySelector('[data-slot="win-line"]')).not.toBeNull();
		expect(container.querySelectorAll('[data-win]')).toHaveLength(3);
		expect(onStateChange).toHaveBeenLastCalledWith(
			'game',
			{ board: ['O', 'O', '', 'X', 'X', 'X', '', '', ''], turn: null, result: 'player', series: { player: 1, computer: 0, draws: 0 } },
			expect.anything()
		);
		await vi.waitFor(() => expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'emit' })));
		const emits = () => onEvent.mock.calls.map(([e]) => e).filter((e) => e?.type === 'emit');
		expect(emits()).toHaveLength(1);
		expect(emits()[0].payload).toEqual({ winner: 'player', series: { player: 1, computer: 0, draws: 0 } });
		// The board is over: more clicks and time change nothing.
		await fireEvent.click(cell(container, 8));
		await think();
		expect(marks(container)[8]).toBe('');
		expect(emits()).toHaveLength(1);
		expect(stat('You')).toContain('1');
	});

	it('lets the computer open, after thinking, when first is computer', async () => {
		const { container } = render(BoardGame, { props: { game: 'tic-tac-toe', first: 'computer', player: 'O', difficulty: 'easy' } });
		expect(slot(container, 'status')).toBe('Thinking…');
		expect(cell(container, 0).getAttribute('aria-disabled')).toBe('true');
		await think();
		expect(marks(container)[0]).toBe('X');
		expect(slot(container, 'status')).toBe('Your turn');
		expect(slot(container, 'meta')).toContain('You are O');
	});
});

describe('board-game: connect-four', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.spyOn(Math, 'random').mockReturnValue(0);
	});

	it('drops to the bottom, shows a ghost, replies, and glows the winning four', async () => {
		const values: { result: unknown }[] = [];
		const done = vi.fn();
		const { container } = render(BoardGame, {
			props: { game: 'connect-four', difficulty: 'easy', onchange: (v: { result: unknown }) => values.push(v), oncomplete: done }
		});
		const col = (c: number) => cell(container, c);
		const token = (i: number) => container.querySelector(`[data-cell="${i}"] .bg-drop .bg-token`)?.getAttribute('data-color') ?? '';
		// A ghost of the visitor's token waits in each landing slot.
		expect(container.querySelector('[data-cell="38"] .bg-ghost')?.getAttribute('data-color')).toBe('red');
		expect(col(3).getAttribute('aria-label')).toBe('Column 4, empty, 6 free');

		await fireEvent.click(col(3));
		expect(token(38)).toBe('red');
		expect(container.querySelector('[data-cell="38"] .bg-glyph circle')).not.toBeNull();
		expect(container.querySelectorAll('.bg-ghost')).toHaveLength(0);
		await think();
		expect(token(35)).toBe('yellow');
		expect(container.querySelector('[data-cell="35"] .bg-glyph path')).not.toBeNull();
		expect(slot(container, 'live')).toBe('Computer dropped in column 1.');
		expect(col(3).getAttribute('aria-label')).toBe('Column 4, bottom up: red, 5 free');

		for (let k = 0; k < 3; k++) {
			await fireEvent.click(col(3));
			if (k < 2) await think();
		}
		expect(slot(container, 'status')).toBe('You win!');
		expect(container.querySelectorAll('.bg-drop[data-win]')).toHaveLength(4);
		expect(values.at(-1)?.result).toBe('player');
		expect(done).toHaveBeenCalledTimes(1);
		expect(done).toHaveBeenCalledWith({ winner: 'player', series: { player: 1, computer: 0, draws: 0 } });
		expect(slot(container, 'legend')).toContain('You, red');
	});
});

describe('board-game: keyboard', () => {
	it('moves a roving focus over the squares with the arrows and plays with Enter and Space', async () => {
		const user = userEvent.setup();
		vi.spyOn(Math, 'random').mockReturnValue(0);
		motion.reduce = true;
		const { container } = render(BoardGame, { props: { game: 'tic-tac-toe', difficulty: 'easy' } });
		expect([...container.querySelectorAll('[data-pos]')].filter((b) => (b as HTMLElement).tabIndex === 0)).toHaveLength(1);
		await user.tab();
		expect(document.activeElement).toBe(cell(container, 0));
		await user.keyboard('{ArrowRight}{ArrowDown}');
		expect(document.activeElement).toBe(cell(container, 4));
		await user.keyboard('{End}');
		expect(document.activeElement).toBe(cell(container, 8));
		await user.keyboard('{Home}{ArrowLeft}{ArrowUp}');
		expect(document.activeElement).toBe(cell(container, 0));
		await user.keyboard('{ArrowDown}{ArrowRight}{Enter}');
		expect(marks(container)[4]).toBe('X');
		await vi.waitFor(() => expect(marks(container)[0]).toBe('O'));
		await user.keyboard('{ArrowRight} ');
		expect(marks(container)[5]).toBe('X');
	});

	it('picks a connect-four column with the arrows and drops with Enter', async () => {
		const user = userEvent.setup();
		motion.reduce = true;
		const { container } = render(BoardGame, { props: { game: 'connect-four' } });
		await user.tab();
		expect(document.activeElement).toBe(cell(container, 0));
		await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowDown}');
		expect(document.activeElement).toBe(cell(container, 3));
		await user.keyboard('{Enter}');
		expect(container.querySelector('[data-cell="38"] .bg-token')?.getAttribute('data-color')).toBe('red');
	});
});

describe('board-game: reduced motion', () => {
	it('moves the computer at once, with no thinking pause', async () => {
		vi.useFakeTimers();
		motion.reduce = true;
		const { container } = render(BoardGame, { props: { game: 'tic-tac-toe', first: 'computer' } });
		await vi.advanceTimersByTimeAsync(0);
		await tick();
		expect(marks(container).filter(Boolean)).toHaveLength(1);
		expect(slot(container, 'status')).toBe('Your turn');
	});
});

describe('board-game: Rematch and series', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.spyOn(Math, 'random').mockReturnValue(0);
	});

	it('Rematch clears the board, keeps the score and writes value; New series resets it', async () => {
		const values: { board: string[]; series: object; result: unknown }[] = [];
		const done = vi.fn();
		const { container } = render(BoardGame, { props: { game: 'tic-tac-toe', difficulty: 'easy', onchange: (v: never) => values.push(v), oncomplete: done } });
		expect(screen.queryByRole('button', { name: 'Rematch' })).toBeNull();
		await winTicTacToe(container);
		await tick();
		const rematch = screen.getByRole('button', { name: 'Rematch' });
		expect(document.activeElement).toBe(rematch);
		await fireEvent.click(rematch);
		expect(marks(container).every((m) => m === '')).toBe(true);
		expect(values.at(-1)).toEqual({ board: Array(9).fill(''), turn: 'player', result: null, series: { player: 1, computer: 0, draws: 0 } });
		expect(slot(container, 'live')).toBe('New game. Your turn.');
		expect(stat('You')).toContain('1');

		await winTicTacToe(container);
		expect(done).toHaveBeenCalledTimes(2);
		expect(done).toHaveBeenLastCalledWith({ winner: 'player', series: { player: 2, computer: 0, draws: 0 } });

		await fireEvent.click(screen.getByRole('button', { name: 'New series' }));
		expect(values.at(-1)?.series).toEqual({ player: 0, computer: 0, draws: 0 });
	});

	it('ends a best-of-3 series on a majority, fires on_complete once, then offers only New series', async () => {
		const done = vi.fn();
		const { container } = render(BoardGame, { props: { game: 'tic-tac-toe', difficulty: 'easy', best_of: 3, oncomplete: done } });
		expect(slot(container, 'meta')).toContain('Best of 3');
		await winTicTacToe(container);
		expect(done).not.toHaveBeenCalled();
		expect(slot(container, 'status')).toBe('You win!');
		await fireEvent.click(screen.getByRole('button', { name: 'Rematch' }));
		await winTicTacToe(container);
		expect(done).toHaveBeenCalledTimes(1);
		expect(done).toHaveBeenCalledWith({ winner: 'player', series: { player: 2, computer: 0, draws: 0 } });
		expect(slot(container, 'status')).toBe('You win! You take the series, 2 to 0.');
		expect(screen.queryByRole('button', { name: 'Rematch' })).toBeNull();
		await fireEvent.click(screen.getByRole('button', { name: 'New series' }));
		expect(stat('You')).toContain('0');
		expect(slot(container, 'status')).toBe('Your turn');
		expect(done).toHaveBeenCalledTimes(1);
	});
});

describe('board-game: a re-sent spec', () => {
	it('keeps the board across a re-send; a new config starts over', async () => {
		vi.useFakeTimers();
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const props = { game: 'tic-tac-toe' as const, difficulty: 'easy' as const, best_of: 3 as const };
		const r = render(BoardGame, { props });
		await fireEvent.click(cell(r.container, 4));
		await think();
		expect(marks(r.container)).toEqual(['O', '', '', '', 'X', '', '', '', '']);

		await r.rerender({ ...structuredClone(props), value: { board: Array(9).fill(''), turn: 'player', result: null, series: { player: 0, computer: 0, draws: 0 } } });
		expect(marks(r.container)).toEqual(['O', '', '', '', 'X', '', '', '', '']);
		// difficulty applies live and does not reset.
		await r.rerender({ ...props, difficulty: 'hard' });
		expect(marks(r.container)[4]).toBe('X');

		await r.rerender({ ...props, player: 'O' });
		expect(marks(r.container).every((m) => m === '')).toBe(true);
	});

	it('drops a pending computer move when the config changes under it', async () => {
		vi.useFakeTimers();
		const r = render(BoardGame, { props: { game: 'tic-tac-toe' } });
		await fireEvent.click(cell(r.container, 4));
		await r.rerender({ game: 'connect-four' });
		await think();
		expect(r.container.querySelectorAll('.bg-drop')).toHaveLength(0);
		expect(slot(r.container, 'status')).toBe('Your turn');
	});
});

describe('board-game: streaming', () => {
	it('streams a spec and ends equal to the whole render', async () => {
		await expectStreamParity({
			ui: { type: 'board-game', props: { game: 'connect-four', title: 'Connect four, best of three', player: 'yellow', difficulty: 'hard', best_of: 3 } }
		});
		cleanup();
		await expectStreamParity({ ui: { type: 'board-game', props: { game: 'tic-tac-toe', player: 'O', first: 'player' } } });
	});
});

describe('board-game: junk props', () => {
	it.each([
		['wrong types everywhere', { game: 'chess', player: 7, first: 'nobody', difficulty: 'insane', best_of: 4, title: { x: 1 } }],
		['a mark from the other game', { game: 'connect-four', player: 'X' }],
		['nothing at all', {}]
	])('%s renders a playable board', (_name, props) => {
		const { container } = render(BoardGame, { props: props as never });
		expect(container.querySelector('[data-widget="board-game"]')).not.toBeNull();
		expect(slot(container, 'status')).toBe('Your turn');
		expect(slot(container, 'meta')).toMatch(/^You are (X|red) · Medium$/);
	});
});
