// widgets/composite/board-game.ts: the rules and the computer opponents of the
// `board-game` widget (plan 2026-10-10, A3): tic-tac-toe (3x3, three in a row)
// and connect-four (7 columns by 6 rows, four in a row). Pure TypeScript, no
// DOM, no Svelte; BoardGame.svelte renders it and board-game.test.ts proves it.
//
// Invariants:
// - A board is a flat, row-major string[] (row 0 on top); '' is empty and a
//   filled cell holds the mark that took it ('X'/'O', 'red'/'yellow').
// - A move is a cell index for tic-tac-toe and a column index for
//   connect-four; `play` drops a connect-four token to the lowest free row.
// - Every AI takes `rand` (default Math.random) so tests can pin it, and never
//   mutates the board it is given.
// - Hard tic-tac-toe is a full search (unbeatable). Hard connect-four is a
//   depth-limited negamax with alpha-beta and the usual window heuristic;
//   C4_DEPTH is sized so a move stays well under 50ms (see the timing test).

export type Game = 'tic-tac-toe' | 'connect-four';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Board = string[];

export interface Dims {
	rows: number;
	cols: number;
	need: number;
}

export const DIMS: Readonly<Record<Game, Dims>> = {
	'tic-tac-toe': { rows: 3, cols: 3, need: 3 },
	'connect-four': { rows: 6, cols: 7, need: 4 }
};

export const MARKS: Readonly<Record<Game, readonly [string, string]>> = {
	'tic-tac-toe': ['X', 'O'],
	'connect-four': ['red', 'yellow']
};

/** Search depth of hard connect-four (plies). */
export const C4_DEPTH = 5;

export const emptyBoard = (game: Game): Board => Array(DIMS[game].rows * DIMS[game].cols).fill('');

function buildLines({ rows, cols, need }: Dims): number[][] {
	const out: number[][] = [];
	const dirs: [number, number][] = [
		[0, 1],
		[1, 0],
		[1, 1],
		[1, -1]
	];
	for (let r = 0; r < rows; r++)
		for (let c = 0; c < cols; c++)
			for (const [dr, dc] of dirs) {
				const er = r + dr * (need - 1);
				const ec = c + dc * (need - 1);
				if (er < 0 || er >= rows || ec < 0 || ec >= cols) continue;
				out.push(Array.from({ length: need }, (_, k) => (r + dr * k) * cols + (c + dc * k)));
			}
	return out;
}

/** Every winning line (window) of the game, as cell indices. */
export const LINES: Readonly<Record<Game, number[][]>> = {
	'tic-tac-toe': buildLines(DIMS['tic-tac-toe']),
	'connect-four': buildLines(DIMS['connect-four'])
};

/** The lines through each cell, for checking only what the last move touched. */
const THROUGH: Readonly<Record<Game, number[][][]>> = {
	'tic-tac-toe': through('tic-tac-toe'),
	'connect-four': through('connect-four')
};
function through(game: Game): number[][][] {
	const out: number[][][] = emptyBoard(game).map(() => []);
	for (const line of LINES[game]) for (const i of line) out[i].push(line);
	return out;
}

/** The winning mark and its line, or null. */
export function winner(game: Game, board: Board): { mark: string; line: number[] } | null {
	for (const line of LINES[game]) {
		const m = board[line[0]];
		if (m && line.every((i) => board[i] === m)) return { mark: m, line };
	}
	return null;
}

/** The line the mark at `cell` completes, if any. */
export function winAt(game: Game, board: Board, cell: number): number[] | null {
	const m = board[cell];
	if (!m) return null;
	for (const line of THROUGH[game][cell]) if (line.every((i) => board[i] === m)) return line;
	return null;
}

export const isFull = (board: Board) => board.every((c) => c !== '');

/** The cell a token dropped in `col` lands on, or -1 when the column is full. */
export function dropCell(board: Board, col: number): number {
	const { rows, cols } = DIMS['connect-four'];
	if (col < 0 || col >= cols) return -1;
	for (let r = rows - 1; r >= 0; r--) if (board[r * cols + col] === '') return r * cols + col;
	return -1;
}

/** Legal moves: empty cells (tic-tac-toe) or columns with room (connect-four). */
export function legalMoves(game: Game, board: Board): number[] {
	if (game === 'tic-tac-toe') return board.flatMap((c, i) => (c === '' ? [i] : []));
	return Array.from({ length: DIMS[game].cols }, (_, c) => c).filter((c) => board[c] === '');
}

/** The cell a move fills, or -1 when it is not legal. */
export function moveCell(game: Game, board: Board, move: number): number {
	if (game === 'connect-four') return dropCell(board, move);
	return Number.isInteger(move) && move >= 0 && move < board.length && board[move] === '' ? move : -1;
}

/** A new board with `move` played by `mark`, and the cell it filled; null when illegal. */
export function play(game: Game, board: Board, move: number, mark: string): { board: Board; cell: number } | null {
	const cell = moveCell(game, board, move);
	if (cell < 0) return null;
	const next = [...board];
	next[cell] = mark;
	return { board: next, cell };
}

const pick = <T>(xs: T[], rand: () => number): T => xs[Math.min(xs.length - 1, Math.floor(rand() * xs.length))];

/** A move that wins on the spot for `mark`, or -1. */
export function winningMove(game: Game, board: Board, mark: string): number {
	for (const m of legalMoves(game, board)) {
		const cell = moveCell(game, board, m);
		board[cell] = mark;
		const won = winAt(game, board, cell) !== null;
		board[cell] = '';
		if (won) return m;
	}
	return -1;
}

// ---- tic-tac-toe, hard: full negamax, memoised by board -------------------

const tttMemo = new Map<string, number>();

/**
 * Best score for `me` to move, relative to this position: 10 for a win now,
 * one less per move it takes; a loss the reverse; 0 for a draw. Relative
 * scores are what make the memo valid at any depth.
 */
function tttScore(board: Board, me: string, them: string): number {
	const key = board.join(',') + '|' + me;
	const hit = tttMemo.get(key);
	if (hit !== undefined) return hit;
	let best = -Infinity;
	for (let i = 0; i < 9; i++) {
		if (board[i] !== '') continue;
		board[i] = me;
		const s = winAt('tic-tac-toe', board, i) ? 10 : -tttScore(board, them, me);
		board[i] = '';
		if (s > best) best = s;
	}
	const score = best === -Infinity ? 0 : best > 0 ? best - 1 : best < 0 ? best + 1 : 0;
	tttMemo.set(key, score);
	return score;
}

function tttHard(board: Board, me: string, them: string, rand: () => number): number {
	const b = [...board];
	let best = -Infinity;
	let bestMoves: number[] = [];
	for (const m of legalMoves('tic-tac-toe', b)) {
		b[m] = me;
		const s = winAt('tic-tac-toe', b, m) ? 10 : -tttScore(b, them, me);
		b[m] = '';
		if (s > best) [best, bestMoves] = [s, [m]];
		else if (s === best) bestMoves.push(m);
	}
	return pick(bestMoves, rand);
}

// ---- connect-four, hard: negamax with alpha-beta and a window heuristic ----

const C4 = DIMS['connect-four'];
const C4_ORDER = [3, 2, 4, 1, 5, 0, 6];
const WIN = 1_000_000;

function windowScore(board: Board, line: number[], me: string, them: string): number {
	let mine = 0;
	let theirs = 0;
	for (const i of line) {
		if (board[i] === me) mine++;
		else if (board[i] === them) theirs++;
	}
	if (mine && theirs) return 0;
	if (mine === 3) return 5;
	if (mine === 2) return 2;
	if (theirs === 3) return -4;
	if (theirs === 2) return -1;
	return 0;
}

/** The standard heuristic: open windows weighted by how full they are, plus the centre column. */
export function c4Heuristic(board: Board, me: string, them: string): number {
	let s = 0;
	for (const line of LINES['connect-four']) s += windowScore(board, line, me, them);
	for (let r = 0; r < C4.rows; r++) {
		const c = board[r * C4.cols + 3];
		if (c === me) s += 3;
		else if (c === them) s -= 3;
	}
	return s;
}

function negamax(board: Board, depth: number, alpha: number, beta: number, me: string, them: string): number {
	if (depth === 0) return c4Heuristic(board, me, them);
	let best = -Infinity;
	let any = false;
	for (const col of C4_ORDER) {
		const cell = dropCell(board, col);
		if (cell < 0) continue;
		any = true;
		board[cell] = me;
		// A quicker win scores higher (more depth left).
		const s = winAt('connect-four', board, cell) ? WIN + depth : -negamax(board, depth - 1, -beta, -alpha, them, me);
		board[cell] = '';
		if (s > best) best = s;
		if (best > alpha) alpha = best;
		if (alpha >= beta) break;
	}
	return any ? best : 0;
}

function c4Hard(board: Board, me: string, them: string, depth: number): number {
	const b = [...board];
	let best = -Infinity;
	let move = -1;
	for (const col of C4_ORDER) {
		const cell = dropCell(b, col);
		if (cell < 0) continue;
		b[cell] = me;
		const s = winAt('connect-four', b, cell) ? WIN + depth : -negamax(b, depth - 1, -Infinity, -best, them, me);
		b[cell] = '';
		if (s > best || move < 0) [best, move] = [s, col];
	}
	return move;
}

/** A column chosen with weight 4 at the centre down to 1 at the edges. */
function centreWeighted(moves: number[], rand: () => number): number {
	const w = moves.map((c) => 4 - Math.abs(c - 3));
	let r = rand() * w.reduce((a, b) => a + b, 0);
	for (let k = 0; k < moves.length; k++) if ((r -= w[k]) < 0) return moves[k];
	return moves[moves.length - 1];
}

/**
 * The computer's move for `me` against `them`: a cell (tic-tac-toe) or a
 * column (connect-four); -1 when there is no legal move.
 * easy: random legal. medium: win, else block, else random (connect-four
 * leans to the centre). hard: tic-tac-toe full search, connect-four negamax.
 */
export function aiMove(
	game: Game,
	board: Board,
	me: string,
	them: string,
	difficulty: Difficulty,
	rand: () => number = Math.random,
	depth = C4_DEPTH
): number {
	const moves = legalMoves(game, board);
	if (!moves.length) return -1;
	if (difficulty === 'easy') return pick(moves, rand);
	if (difficulty === 'hard') return game === 'tic-tac-toe' ? tttHard(board, me, them, rand) : c4Hard(board, me, them, depth);
	const b = [...board];
	const win = winningMove(game, b, me);
	if (win >= 0) return win;
	const block = winningMove(game, b, them);
	if (block >= 0) return block;
	return game === 'connect-four' ? centreWeighted(moves, rand) : pick(moves, rand);
}
