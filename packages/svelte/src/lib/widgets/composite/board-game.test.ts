// widgets/composite/board-game.test.ts — the pure rules and AIs behind the
// board-game widget: every tic-tac-toe line, connect-four in all four
// directions, the full-board draw, medium's win and block, hard tic-tac-toe
// never losing (against random play and against itself), and the move-time
// budget of hard connect-four.
import { describe, expect, it } from 'vitest';
import {
	C4_DEPTH,
	LINES,
	aiMove,
	dropCell,
	emptyBoard,
	isFull,
	legalMoves,
	play,
	winAt,
	winner,
	type Board,
	type Difficulty,
	type Game
} from './board-game.js';

/** A seeded generator, so a failing game can be replayed. */
function seeded(seed: number) {
	let h = seed >>> 0;
	return () => {
		h = (h + 0x6d2b79f5) | 0;
		let t = Math.imul(h ^ (h >>> 15), 1 | h);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Board from rows of characters: '.' empty, X/O, R(ed)/Y(ellow). */
function parse(rows: string[]): Board {
	const map: Record<string, string> = { '.': '', X: 'X', O: 'O', R: 'red', Y: 'yellow' };
	return rows.join('').split('').map((ch) => map[ch]);
}

/** Plays a whole game; returns the winning mark or 'draw'. */
function game(g: Game, a: { mark: string; diff: Difficulty | 'random' }, b: { mark: string; diff: Difficulty | 'random' }, rand: () => number) {
	let board = emptyBoard(g);
	let [cur, other] = [a, b];
	for (;;) {
		const move = cur.diff === 'random' ? aiMove(g, board, cur.mark, other.mark, 'easy', rand) : aiMove(g, board, cur.mark, other.mark, cur.diff, rand);
		const next = play(g, board, move, cur.mark)!;
		expect(next).not.toBeNull();
		board = next.board;
		if (winAt(g, board, next.cell)) return cur.mark;
		if (isFull(board)) return 'draw';
		[cur, other] = [other, cur];
	}
}

describe('tic-tac-toe rules', () => {
	it('has exactly the 8 lines, and each one wins', () => {
		const expected = [
			[0, 1, 2],
			[3, 4, 5],
			[6, 7, 8],
			[0, 3, 6],
			[1, 4, 7],
			[2, 5, 8],
			[0, 4, 8],
			[2, 4, 6]
		];
		const key = (l: number[]) => l.join(',');
		expect(LINES['tic-tac-toe'].map(key).toSorted()).toEqual(expected.map(key).toSorted());
		for (const line of expected) {
			const board = emptyBoard('tic-tac-toe');
			for (const i of line) board[i] = 'O';
			expect(winner('tic-tac-toe', board)).toEqual({ mark: 'O', line });
			expect(winAt('tic-tac-toe', board, line[1])).toEqual(line);
		}
	});

	it('finds no winner on a full drawn board', () => {
		const board = parse(['XOX', 'XOO', 'OXX']);
		expect(winner('tic-tac-toe', board)).toBeNull();
		expect(isFull(board)).toBe(true);
		expect(legalMoves('tic-tac-toe', board)).toEqual([]);
		expect(aiMove('tic-tac-toe', board, 'X', 'O', 'hard')).toBe(-1);
	});

	it('refuses a taken or out-of-range cell', () => {
		const board = parse(['X..', '...', '...']);
		expect(play('tic-tac-toe', board, 0, 'O')).toBeNull();
		expect(play('tic-tac-toe', board, 9, 'O')).toBeNull();
		expect(play('tic-tac-toe', board, 4, 'O')).toEqual({ board: parse(['X..', '.O.', '...']), cell: 4 });
		expect(board).toEqual(parse(['X..', '...', '...']));
	});
});

describe('connect-four rules', () => {
	it('drops to the lowest free row and refuses a full column', () => {
		let board = emptyBoard('connect-four');
		expect(dropCell(board, 3)).toBe(38);
		board = play('connect-four', board, 3, 'red')!.board;
		expect(dropCell(board, 3)).toBe(31);
		for (let k = 0; k < 5; k++) board = play('connect-four', board, 3, k % 2 ? 'red' : 'yellow')!.board;
		expect(dropCell(board, 3)).toBe(-1);
		expect(play('connect-four', board, 3, 'red')).toBeNull();
		expect(legalMoves('connect-four', board)).toEqual([0, 1, 2, 4, 5, 6]);
	});

	it.each([
		['horizontal', ['.......', '.......', '.......', '.......', '.......', 'YRRRRYY'], [36, 37, 38, 39]],
		['vertical', ['.......', '.......', '......R', '......R', '......R', 'Y.Y..YR'], [20, 27, 34, 41]],
		['diagonal down-right', ['.......', '.......', 'R......', 'YR.....', 'YYR....', 'YRYR...'], [14, 22, 30, 38]],
		['diagonal up-right', ['.......', '.......', '...Y...', '..YR...', '.YRR...', 'YRRY...'], [17, 23, 29, 35]]
	])('wins %s', (_name, rows, line) => {
		const board = parse(rows);
		const w = winner('connect-four', board)!;
		expect(w.line.toSorted((a, b) => a - b)).toEqual(line);
		expect(winAt('connect-four', board, line[0])).not.toBeNull();
	});

	it('has 69 windows and draws on a full board with no four', () => {
		expect(LINES['connect-four']).toHaveLength(69);
		const board = parse(['RRYYRRY', 'YYRRYYR', 'RRYYRRY', 'YYRRYYR', 'RRYYRRY', 'YYRRYYR']);
		expect(isFull(board)).toBe(true);
		expect(winner('connect-four', board)).toBeNull();
		expect(aiMove('connect-four', board, 'red', 'yellow', 'medium')).toBe(-1);
	});
});

describe('medium AI', () => {
	it('takes a win over a block, and blocks a loss (tic-tac-toe)', () => {
		// O to move: O wins at 5 (row 2); X threatens 2 (top row).
		expect(aiMove('tic-tac-toe', parse(['XX.', 'OO.', 'X..']), 'O', 'X', 'medium')).toBe(5);
		// Only a block: X threatens 2.
		for (let s = 0; s < 20; s++) expect(aiMove('tic-tac-toe', parse(['XX.', 'O..', '...']), 'O', 'X', 'medium', seeded(s))).toBe(2);
	});

	it('takes a win over a block, and blocks a loss (connect-four)', () => {
		// yellow wins in column 6 (bottom row) and red threatens column 0 (vertical).
		const both = parse(['.......', '.......', '.......', 'R......', 'R......', 'R.RYYY.']);
		expect(aiMove('connect-four', both, 'yellow', 'red', 'medium')).toBe(6);
		const block = parse(['.......', '.......', '.......', 'R......', 'R......', 'R...YY.']);
		for (let s = 0; s < 20; s++) expect(aiMove('connect-four', block, 'yellow', 'red', 'medium', seeded(s))).toBe(0);
		// The hard AI does both too.
		expect(aiMove('connect-four', both, 'yellow', 'red', 'hard')).toBe(6);
		expect(aiMove('connect-four', block, 'yellow', 'red', 'hard')).toBe(0);
	});

	it('leans to the centre on an open connect-four board', () => {
		const rand = seeded(7);
		const counts = Array(7).fill(0);
		for (let k = 0; k < 2000; k++) counts[aiMove('connect-four', emptyBoard('connect-four'), 'red', 'yellow', 'medium', rand)]++;
		expect(counts[3]).toBeGreaterThan(counts[0] * 2.5);
		expect(counts.every((c) => c > 0)).toBe(true);
	});
});

describe('hard tic-tac-toe is unbeatable', () => {
	it('never loses to random play, moving first or second (600 games)', () => {
		const rand = seeded(42);
		const tally = { hard: 0, random: 0, draw: 0 };
		for (let k = 0; k < 600; k++) {
			const hardFirst = k % 2 === 0;
			const hard = { mark: hardFirst ? 'X' : 'O', diff: 'hard' as const };
			const rnd = { mark: hardFirst ? 'O' : 'X', diff: 'random' as const };
			const w = hardFirst ? game('tic-tac-toe', hard, rnd, rand) : game('tic-tac-toe', rnd, hard, rand);
			tally[w === hard.mark ? 'hard' : w === 'draw' ? 'draw' : 'random']++;
		}
		expect(tally.random).toBe(0);
		expect(tally.hard).toBeGreaterThan(400);
	});

	it('always draws against itself (50 games, random tie-breaks)', () => {
		const rand = seeded(9);
		for (let k = 0; k < 50; k++) expect(game('tic-tac-toe', { mark: 'X', diff: 'hard' }, { mark: 'O', diff: 'hard' }, rand)).toBe('draw');
	});

	it('wins at once rather than later', () => {
		// X can win now at 2, or set up a fork; it must take the win.
		expect(aiMove('tic-tac-toe', parse(['XX.', 'OO.', '...']), 'X', 'O', 'hard')).toBe(2);
	});
});

describe('hard connect-four', () => {
	it('beats random play', () => {
		const rand = seeded(3);
		let wins = 0;
		for (let k = 0; k < 20; k++) if (game('connect-four', { mark: 'red', diff: 'hard' }, { mark: 'yellow', diff: 'random' }, rand) === 'red') wins++;
		expect(wins).toBeGreaterThanOrEqual(19);
	});

	it(`stays under the 50ms budget at depth ${C4_DEPTH} (median of 7)`, () => {
		const mid = parse(['.......', '.......', '...Y...', '..RRY..', '..YRRY.', '.RYYRR.']);
		const time = (board: Board) => {
			const runs: number[] = [];
			for (let k = 0; k < 7; k++) {
				const t = performance.now();
				aiMove('connect-four', board, 'yellow', 'red', 'hard');
				runs.push(performance.now() - t);
			}
			return runs.toSorted((a, b) => a - b)[3];
		};
		const opening = time(emptyBoard('connect-four'));
		const midgame = time(mid);
		console.info(`[board-game] hard connect-four depth ${C4_DEPTH}: opening ${opening.toFixed(1)}ms, mid-game ${midgame.toFixed(1)}ms`);
		expect(opening).toBeLessThan(50);
		expect(midgame).toBeLessThan(50);
	});
});
