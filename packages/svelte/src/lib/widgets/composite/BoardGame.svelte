<!--
  widgets/composite/BoardGame.svelte: `board-game`: tic-tac-toe or
  connect-four against a built-in computer opponent (plan 2026-10-10, A3). The
  model picks the game and the settings; the rules and the three computer
  levels live in ./board-game.ts (pure, no DOM).

  Invariants:
  - `game` picks the board; without it the registry alias decides
    (`connect-four` reads the `data-ripple-type` stamp NodeRenderer passes),
    else tic-tac-toe.
  - Play state is tagged with a config signature (game, player, first,
    best_of): a re-sent spec keeps the board, a genuinely new config starts
    fresh. `difficulty` applies from the next computer move.
  - The computer moves only from an $effect, after a 300 to 600ms "thinking"
    pause (none under reduced motion), and only if the state it was scheduled
    for is still current. SSR and the first client frame never move.
  - `value` is the one bound field (default contract `value` / `onchange`):
    { board, turn, result, series }, written on every move, Rematch and New
    series. Incoming values are ignored.
  - `on_complete` fires once per finished series with { winner, series }.
    Without `best_of` the series is open-ended and every game finishes it.
  - Cells (tic-tac-toe) and columns (connect-four) are named buttons on a
    roving tabindex with arrow keys; a live region says the computer's move
    and the result. Tokens carry a shape as well as a colour.
-->
<script module lang="ts">
	import type { Board, Difficulty, Game } from './board-game.js';

	export type Side = 'player' | 'computer';
	export type Result = Side | 'draw' | null;
	export interface Series {
		player: number;
		computer: number;
		draws: number;
	}
	export interface BoardGameValue {
		board: Board;
		turn: Side | null;
		result: Result;
		series: Series;
	}

	export const THINK_MS = [300, 600] as const;
	export const GAMES: readonly Game[] = ['tic-tac-toe', 'connect-four'];
	const LEVELS: readonly Difficulty[] = ['easy', 'medium', 'hard'];
	const ZERO: Series = { player: 0, computer: 0, draws: 0 };

	/** Who took a best-of series, 'draw' for a level finish, null while it runs. */
	export function seriesWinner(s: Series, bestOf: number): Result {
		const need = Math.floor(bestOf / 2) + 1;
		if (s.player >= need) return 'player';
		if (s.computer >= need) return 'computer';
		if (s.player + s.computer + s.draws < bestOf) return null;
		return s.player > s.computer ? 'player' : s.computer > s.player ? 'computer' : 'draw';
	}
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { safeStyle } from '@ripple-ui/core';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import User from '@lucide/svelte/icons/user';
	import Bot from '@lucide/svelte/icons/bot';
	import Handshake from '@lucide/svelte/icons/handshake';
	import { StatChip, plain } from '../data-kit/index.js';
	import { DIMS, MARKS, aiMove, dropCell, emptyBoard, isFull, play, winAt } from './board-game.js';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		title?: string;
		game?: Game;
		/** The visitor's mark: 'X' | 'O' (tic-tac-toe) or 'red' | 'yellow' (connect-four). */
		player?: string;
		first?: Side;
		difficulty?: Difficulty;
		best_of?: 1 | 3 | 5;
		/** { board, turn, result, series }, written by the widget; bindable. */
		value?: BoardGameValue;
		onchange?: (value: BoardGameValue) => void;
		/** Fires once per finished series. */
		oncomplete?: (result: { winner: Result; series: Series }) => void;
		/** The node's type as NodeRenderer stamps it; picks the game for an alias. */
		'data-ripple-type'?: string;
	}

	let {
		id,
		class: className,
		style,
		title,
		game,
		player,
		first,
		difficulty,
		best_of,
		value = $bindable(),
		onchange,
		oncomplete,
		'data-ripple-type': nodeType
	}: Props = $props();

	const rootStyle = $derived(
		style && typeof style === 'object'
			? safeStyle(Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';'))
			: safeStyle(typeof style === 'string' ? style : '')
	);

	const g: Game = $derived(
		GAMES.includes(game as Game) ? (game as Game) : nodeType === 'connect-four' ? 'connect-four' : 'tic-tac-toe'
	);
	const ttt = $derived(g === 'tic-tac-toe');
	const dims = $derived(DIMS[g]);
	const me = $derived.by(() => {
		const p = typeof player === 'string' ? player.trim() : '';
		const want = ttt ? p.toUpperCase() : p.toLowerCase();
		return MARKS[g].includes(want) ? want : MARKS[g][0];
	});
	const them = $derived(MARKS[g][0] === me ? MARKS[g][1] : MARKS[g][0]);
	const starter: Side = $derived(first === 'computer' ? 'computer' : 'player');
	const level: Difficulty = $derived(LEVELS.includes(difficulty as Difficulty) ? (difficulty as Difficulty) : 'medium');
	const bestOf = $derived([1, 3, 5].includes(Number(best_of)) ? Number(best_of) : 0);
	const heading = $derived(plain(title) || (ttt ? 'Tic-tac-toe' : 'Connect four'));
	const sig = $derived(`${g}|${me}|${starter}|${bestOf}`);

	type Play = {
		sig: string;
		board: Board;
		turn: Side | null;
		result: Result;
		line: number[] | null;
		/** The series result once decided (every game, when open-ended). */
		decided: Result;
		series: Series;
	};
	const fresh = (series: Series = ZERO): Play => ({
		sig,
		board: emptyBoard(g),
		turn: starter,
		result: null,
		line: null,
		decided: null,
		series
	});

	let progress = $state<Play | null>(null);
	let said = $state('');
	let focusAt = $state(0);
	let boardEl = $state<HTMLElement>();
	let againEl = $state<HTMLButtonElement>();

	const cur = $derived(progress?.sig === sig ? progress : fresh());
	const playerTurn = $derived(cur.turn === 'player' && !cur.result);
	const winCells = $derived(new Set(cur.line ?? []));

	function write(p: Play) {
		const v: BoardGameValue = { board: [...p.board], turn: p.turn, result: p.result, series: { ...p.series } };
		value = v;
		onchange?.(v);
	}

	const resultText = (r: Result) => (r === 'player' ? 'You win!' : r === 'computer' ? 'Computer wins.' : r === 'draw' ? 'Draw.' : '');
	const seriesText = (p: Play) => {
		if (!bestOf || !p.decided) return '';
		const score = `${p.series.player} to ${p.series.computer}`;
		return p.decided === 'player' ? `You take the series, ${score}.` : p.decided === 'computer' ? `Computer takes the series, ${score}.` : `Series drawn, ${score}.`;
	};

	/** Plays `move` for `who`; returns the new state, or null when the move is illegal. */
	function apply(move: number, who: Side): Play | null {
		const res = play(g, cur.board, move, who === 'player' ? me : them);
		if (!res) return null;
		const line = winAt(g, res.board, res.cell);
		const result: Result = line ? who : isFull(res.board) ? 'draw' : null;
		let series = cur.series;
		let decided: Result = null;
		if (result) {
			const key = result === 'draw' ? 'draws' : result;
			series = { ...series, [key]: series[key] + 1 };
			decided = bestOf ? seriesWinner(series, bestOf) : result;
		}
		const next: Play = { ...cur, board: res.board, line, result, decided, series, turn: result ? null : who === 'player' ? 'computer' : 'player' };
		progress = next;
		write(next);
		if (decided) oncomplete?.({ winner: decided, series: { ...series } });
		if (result) void tick().then(() => againEl?.focus());
		return next;
	}

	function where(cell: number) {
		const r = Math.floor(cell / dims.cols) + 1;
		const c = (cell % dims.cols) + 1;
		return ttt ? `row ${r}, column ${c}` : `column ${c}`;
	}

	// The computer's turn: think for a moment, then move, unless the game moved on.
	$effect(() => {
		const scheduled = cur;
		if (scheduled.turn !== 'computer' || scheduled.result) return;
		const wait = prefersReducedMotion.current ? 0 : THINK_MS[0] + Math.random() * (THINK_MS[1] - THINK_MS[0]);
		const t = setTimeout(() => {
			if (cur !== scheduled) return;
			const move = aiMove(g, scheduled.board, them, me, level);
			const next = apply(move, 'computer');
			if (!next) return;
			const cell = next.board.findIndex((c, i) => c !== scheduled.board[i]);
			said = `Computer ${ttt ? 'played' : 'dropped in'} ${where(cell)}. ${resultText(next.result)} ${seriesText(next)}`.trim();
		}, wait);
		return () => clearTimeout(t);
	});

	function choose(move: number) {
		if (!playerTurn) return;
		const next = apply(move, 'player');
		if (next?.result) said = `${resultText(next.result)} ${seriesText(next)}`.trim();
	}

	function restart(keepSeries: boolean) {
		const next = fresh(keepSeries ? cur.series : ZERO);
		progress = next;
		write(next);
		said = `${keepSeries ? 'New game' : 'New series'}. ${starter === 'player' ? 'Your turn.' : 'Computer goes first.'}`;
		focusAt = ttt ? 4 : 3;
		void tick().then(() => (boardEl?.querySelector('[tabindex="0"]') as HTMLElement | null)?.focus());
	}

	const seriesOver = $derived(bestOf > 0 && cur.decided !== null);

	function onkeydown(e: KeyboardEvent) {
		const n = ttt ? 9 : dims.cols;
		const from = Number((e.currentTarget as HTMLElement | null)?.dataset.pos ?? focusAt);
		const step: Record<string, number> = ttt
			? { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }
			: { ArrowRight: 1, ArrowLeft: -1 };
		let to: number;
		if (e.key in step) to = from + step[e.key];
		else if (e.key === 'Home') to = 0;
		else if (e.key === 'End') to = n - 1;
		else return;
		e.preventDefault();
		if (to < 0 || to >= n) return;
		focusAt = to;
		(boardEl?.querySelectorAll('[data-pos]')[to] as HTMLElement | undefined)?.focus();
	}

	const cellLabel = (i: number) => `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}, ${cur.board[i] || 'empty'}`;
	function columnLabel(c: number) {
		const stack: string[] = [];
		for (let r = dims.rows - 1; r >= 0; r--) if (cur.board[r * dims.cols + c]) stack.push(cur.board[r * dims.cols + c]);
		const free = dims.rows - stack.length;
		const contents = stack.length ? `bottom up: ${stack.join(', ')}` : 'empty';
		return `Column ${c + 1}, ${contents}, ${free ? `${free} free` : 'full'}`;
	}

	/** Centre of a tic-tac-toe cell in the 300-unit board space. */
	const centre = (i: number) => [(i % 3) * 100 + 50, Math.floor(i / 3) * 100 + 50];
	const winPath = $derived.by(() => {
		if (!ttt || !cur.line) return '';
		const [x1, y1] = centre(cur.line[0]);
		const [x2, y2] = centre(cur.line[2]);
		const len = Math.hypot(x2 - x1, y2 - y1);
		const ex = ((x2 - x1) / len) * 34;
		const ey = ((y2 - y1) / len) * 34;
		return `M${x1 - ex} ${y1 - ey} L${x2 + ex} ${y2 + ey}`;
	});

	const status = $derived(
		cur.result
			? seriesOver
				? `${resultText(cur.result)} ${seriesText(cur)}`
				: resultText(cur.result).replace(/\.$/, '')
			: cur.turn === 'player'
				? 'Your turn'
				: 'Thinking…'
	);
	const meta = $derived(
		[`You are ${me}`, level[0].toUpperCase() + level.slice(1), bestOf ? `Best of ${bestOf}` : ''].filter(Boolean).join(' · ')
	);

	const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring';
	const primaryBtn = [
		'inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ripple-accent px-5 text-body-emph text-ripple-accent-foreground transition-opacity hover:opacity-90',
		focusRing
	];
	const secondaryBtn = [
		'inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ripple-border bg-ripple-surface px-4 text-body-emph transition-colors hover:bg-ripple-muted motion-reduce:transition-none',
		focusRing
	];
</script>

{#snippet token(color: string, ghost = false)}
	<span class={['bg-token', ghost && 'bg-ghost']} data-color={color} aria-hidden="true">
		<svg viewBox="0 0 24 24" class="bg-glyph">
			{#if color === 'red'}
				<circle cx="12" cy="12" r="5" />
			{:else}
				<path d="M12 6.5 17.5 12 12 17.5 6.5 12Z" />
			{/if}
		</svg>
	</span>
{/snippet}

<div {id} class={['@container text-ripple-surface-foreground', className]} style={rootStyle} data-widget="board-game" data-game={g}>
	<div class="flex flex-col gap-3">
		<header class="flex min-w-0 flex-col gap-0.5">
			<h2 class="text-title-3 font-semibold text-pretty">{heading}</h2>
			<p class="flex flex-wrap items-center gap-1.5 text-footnote text-ripple-muted-foreground" data-slot="meta">
				{#if !ttt}{@render token(me)}{/if}{meta}
			</p>
		</header>

		<div class="grid grid-cols-3 gap-2" data-slot="score">
			<StatChip label="You" value={cur.series.player} icon={User} />
			<StatChip label="Computer" value={cur.series.computer} icon={Bot} />
			<StatChip label="Draws" value={cur.series.draws} icon={Handshake} />
		</div>

		<p
			class={[
				'flex min-h-7 items-center justify-center gap-2 text-center text-body-emph',
				cur.result === 'player' && 'text-ripple-success-text',
				cur.result === 'computer' && 'text-ripple-error-text'
			]}
			data-slot="status"
			data-turn={cur.turn ?? 'over'}
		>
			{#if !cur.result && cur.turn === 'computer'}<span class="bg-think" aria-hidden="true"></span>{/if}
			{status}
		</p>

		{#if ttt}
			<div class="bg-ttt relative mx-auto aspect-square w-full max-w-[380px]" data-slot="board">
				<svg class="pointer-events-none absolute inset-0 text-ripple-border" viewBox="0 0 300 300" aria-hidden="true">
					<path d="M100 14V286M200 14V286M14 100H286M14 200H286" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" />
				</svg>
				<div bind:this={boardEl} class="absolute inset-0 grid grid-cols-3 grid-rows-3" role="group" aria-label="Board">
					{#each cur.board as cell, i (i)}
						<button
							type="button"
							class={['bg-cell grid place-items-center rounded-ripple', focusRing, playerTurn && !cell && 'bg-open']}
							data-pos={i}
							data-mark={cell || undefined}
							data-win={winCells.has(i) || undefined}
							tabindex={i === focusAt ? 0 : -1}
							aria-label={cellLabel(i)}
							aria-disabled={!playerTurn || !!cell || undefined}
							onclick={() => choose(i)}
							{onkeydown}
						>
							{#if cell}
								<svg
									viewBox="0 0 100 100"
									class={['bg-mark', cell === me ? 'text-ripple-accent' : 'text-ripple-surface-foreground']}
									aria-hidden="true"
								>
									{#if cell === 'X'}
										<path d="M22 22 78 78" pathLength="1" />
										<path d="M78 22 22 78" pathLength="1" class="bg-second" />
									{:else}
										<circle cx="50" cy="50" r="29" pathLength="1" transform="rotate(-90 50 50)" />
									{/if}
								</svg>
							{/if}
						</button>
					{/each}
				</div>
				{#if winPath}
					<svg class="pointer-events-none absolute inset-0" viewBox="0 0 300 300" aria-hidden="true" data-slot="win-line">
						<path
							d={winPath}
							pathLength="1"
							class="bg-strike"
							data-by={cur.result}
						/>
					</svg>
				{/if}
			</div>
		{:else}
			<div class="bg-c4 mx-auto w-full max-w-[440px] overflow-hidden rounded-[14px] bg-ripple-accent p-1.5 @min-[400px]:p-2" data-slot="board">
				<div bind:this={boardEl} class="grid grid-cols-7" role="group" aria-label="Columns">
					{#each Array.from({ length: dims.cols }, (_, c) => c) as c (c)}
						{@const landing = playerTurn ? dropCell(cur.board, c) : -1}
						<button
							type="button"
							class={['bg-col flex flex-col gap-1 rounded-md p-0.5 @min-[400px]:gap-1.5 @min-[400px]:p-1', focusRing]}
							data-pos={c}
							tabindex={c === focusAt ? 0 : -1}
							aria-label={columnLabel(c)}
							aria-disabled={!playerTurn || cur.board[c] !== '' || undefined}
							onclick={() => choose(c)}
							{onkeydown}
						>
							{#each Array.from({ length: dims.rows }, (_, r) => r) as r (r)}
								{@const i = r * dims.cols + c}
								<span class="bg-slot relative block aspect-square w-full rounded-full" data-cell={i}>
									{#if cur.board[i]}
										<span class="bg-drop" style:--rows={r + 1} data-win={winCells.has(i) || undefined}>
											{@render token(cur.board[i])}
										</span>
									{:else if i === landing}
										{@render token(me, true)}
									{/if}
								</span>
							{/each}
						</button>
					{/each}
				</div>
			</div>
			<p class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-footnote text-ripple-muted-foreground" data-slot="legend">
				<span class="inline-flex items-center gap-1.5">{@render token(me)}You, {me}</span>
				<span class="inline-flex items-center gap-1.5">{@render token(them)}Computer, {them}</span>
			</p>
		{/if}

		<div class="flex flex-wrap items-center justify-center gap-2" data-slot="actions">
			{#if cur.result && !seriesOver}
				<button type="button" class={primaryBtn} bind:this={againEl} onclick={() => restart(true)}>
					<RotateCcw size={16} strokeWidth={2} aria-hidden="true" />Rematch
				</button>
			{/if}
			{#if seriesOver}
				<button type="button" class={primaryBtn} bind:this={againEl} onclick={() => restart(false)}>
					<RefreshCw size={16} strokeWidth={2} aria-hidden="true" />New series
				</button>
			{:else}
				<button type="button" class={secondaryBtn} onclick={() => restart(false)}>
					<RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />New series
				</button>
			{/if}
		</div>
		<p class="text-center text-footnote text-ripple-muted-foreground">
			{ttt ? 'Arrow keys move between squares, Enter plays.' : 'Arrow keys pick a column, Enter drops a token.'}
		</p>

		<p class="sr-only" aria-live="polite" data-slot="live">{said}</p>
	</div>
</div>

<style>
	.bg-cell {
		margin: 6%;
		cursor: default;
	}
	.bg-open {
		cursor: pointer;
	}
	.bg-open:hover {
		background: color-mix(in oklab, var(--ripple-accent) 8%, transparent);
	}
	.bg-mark {
		width: 88%;
		height: 88%;
		fill: none;
		stroke: currentColor;
		stroke-width: 9;
		stroke-linecap: round;
	}
	.bg-mark :is(path, circle),
	.bg-strike {
		stroke-dasharray: 1;
		stroke-dashoffset: 0;
		animation: bg-draw 240ms cubic-bezier(0.3, 0.7, 0.3, 1) both;
	}
	.bg-mark .bg-second {
		animation-delay: 140ms;
	}
	.bg-strike {
		fill: none;
		stroke: var(--ripple-error);
		stroke-width: 8;
		stroke-linecap: round;
		animation-duration: 420ms;
		animation-delay: 120ms;
	}
	.bg-strike[data-by='player'] {
		stroke: var(--ripple-success);
	}
	@keyframes bg-draw {
		from {
			stroke-dashoffset: 1;
		}
		to {
			stroke-dashoffset: 0;
		}
	}
	.bg-col {
		cursor: default;
	}
	.bg-col:not([aria-disabled='true']) {
		cursor: pointer;
	}
	.bg-col:not([aria-disabled='true']):hover {
		background: color-mix(in oklab, white 12%, transparent);
	}
	.bg-slot {
		background: var(--ripple-surface);
		box-shadow: inset 0 2px 3px color-mix(in oklab, black 22%, transparent);
	}
	.bg-drop {
		position: absolute;
		inset: 0;
		display: block;
		border-radius: 999px;
		animation: bg-fall 300ms cubic-bezier(0.5, 0, 0.75, 0) both;
	}
	@keyframes bg-fall {
		from {
			transform: translateY(calc(var(--rows) * -118%));
		}
		to {
			transform: none;
		}
	}
	.bg-token {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: var(--bg-token);
		box-shadow: inset 0 -3px 0 color-mix(in oklab, black 18%, transparent);
	}
	header .bg-token,
	[data-slot='legend'] .bg-token {
		position: relative;
		width: 16px;
		height: 16px;
		box-shadow: none;
	}
	.bg-token[data-color='red'] {
		--bg-token: var(--ripple-error);
	}
	.bg-token[data-color='yellow'] {
		--bg-token: var(--ripple-warning);
	}
	.bg-glyph {
		width: 70%;
		height: 70%;
		fill: none;
		stroke: color-mix(in oklab, black 38%, transparent);
		stroke-width: 2.5;
	}
	.bg-ghost {
		opacity: 0;
		transition: opacity 120ms ease-out;
	}
	.bg-col:hover .bg-ghost,
	.bg-col:focus-visible .bg-ghost {
		opacity: 0.4;
	}
	.bg-drop[data-win] .bg-token {
		box-shadow:
			0 0 0 3px var(--ripple-surface),
			0 0 14px 5px color-mix(in oklab, var(--bg-token) 70%, transparent);
		animation: bg-glow 1.2s ease-in-out 300ms infinite alternate;
	}
	@keyframes bg-glow {
		to {
			box-shadow:
				0 0 0 3px var(--ripple-surface),
				0 0 4px 1px color-mix(in oklab, var(--bg-token) 50%, transparent);
		}
	}
	.bg-think {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--ripple-accent);
		animation: bg-pulse 900ms ease-in-out infinite alternate;
	}
	@keyframes bg-pulse {
		from {
			opacity: 0.25;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.bg-mark :is(path, circle),
		.bg-strike,
		.bg-drop,
		.bg-drop[data-win] .bg-token,
		.bg-think {
			animation: none;
		}
		.bg-ghost {
			transition: none;
		}
	}
</style>
