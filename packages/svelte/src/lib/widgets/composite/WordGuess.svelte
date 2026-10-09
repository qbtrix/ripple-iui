<!--
  widgets/composite/WordGuess.svelte, `word-guess`: a daily-word style
  guessing game. The model writes a 4 to 7 letter `answer`; the visitor types
  (physical keyboard on the focused board, or the on-screen keys), gets
  per-letter feedback, may reveal the `hint`, and ends on a win or lose
  screen with a plain-text share grid copied to the clipboard.

  Invariants:
  - `score()` is the standard count-limited scoring: exact matches first, then
    "in word" only while that letter has unmatched copies left in the answer.
  - Local play state is keyed by the answer it was played against (`game.for`).
    A re-sent spec keeps it; a new answer shows a fresh board with no effect
    running (SSR- and stream-safe).
  - `value` ({ guesses, status, hint_used }) is write-only: the widget writes
    it on every guess and hint and never reads it back (bind contract default
    `value` / `onchange`). `oncomplete` fires once, on the playing to won/lost
    transition, with { won, guesses }.
  - Feedback is never colour-only: every tile carries an aria-label ("R,
    correct spot") and a corner glyph, and a polite live region reads each
    result. Flip and shake are CSS on classes set synchronously, so state and
    labels never wait on an animation; reduced motion drops both.
  - The answer sits in the spec. That is acceptable for a casual game.
-->
<script module lang="ts">
	export type Feedback = 'correct' | 'present' | 'absent';
	export type GameStatus = 'playing' | 'won' | 'lost';
	export interface WordGuessValue {
		guesses: string[];
		status: GameStatus;
		hint_used: boolean;
	}

	/** Per-letter feedback for `guess` against `answer` (same length, upper case). */
	export function score(guess: string, answer: string): Feedback[] {
		const out: Feedback[] = Array.from(guess, () => 'absent');
		const left = new Map<string, number>();
		for (let i = 0; i < answer.length; i++) {
			if (guess[i] === answer[i]) out[i] = 'correct';
			else left.set(answer[i], (left.get(answer[i]) ?? 0) + 1);
		}
		for (let i = 0; i < guess.length; i++) {
			if (out[i] === 'correct') continue;
			const n = left.get(guess[i]) ?? 0;
			if (n > 0) {
				out[i] = 'present';
				left.set(guess[i], n - 1);
			}
		}
		return out;
	}

	const RANK: Record<Feedback, number> = { absent: 1, present: 2, correct: 3 };

	/** Each guessed letter's best state across all guesses. */
	export function keyStates(guesses: readonly string[], answer: string): Record<string, Feedback> {
		const best: Record<string, Feedback> = {};
		for (const g of guesses) {
			score(g, answer).forEach((f, i) => {
				const k = g[i];
				if (!best[k] || RANK[f] > RANK[best[k]]) best[k] = f;
			});
		}
		return best;
	}

	/** The answer as play letters, or why it can't be played. */
	export function parseAnswer(v: unknown): { word: string; error?: string } {
		const word = typeof v === 'string' ? v.trim().toUpperCase() : '';
		if (!word) return { word: '', error: 'No puzzle yet.' };
		if (!/^[A-Z]{4,7}$/.test(word)) return { word: '', error: 'This puzzle needs a 4 to 7 letter answer, A to Z only.' };
		return { word };
	}

	export const WORDS: Record<Feedback, string> = { correct: 'correct spot', present: 'in word', absent: 'not in word' };
	const SQUARE: Record<Feedback, string> = { correct: '🟩', present: '🟨', absent: '⬜' };

	/** The plain-text share grid: a header line, then one row of squares per guess. Never the answer. */
	export function shareText(o: { title: string; guesses: readonly string[]; answer: string; max: number; won: boolean; hintUsed: boolean }): string {
		const head = `${o.title} ${o.won ? o.guesses.length : 'X'}/${o.max}${o.hintUsed ? ' (hint)' : ''}`;
		return [head, ...o.guesses.map((g) => score(g, o.answer).map((f) => SQUARE[f]).join(''))].join('\n');
	}

	const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((r) => r.split(''));
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { safeStyle } from '@ripple-ui/core';
	import Check from '@lucide/svelte/icons/check';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import Minus from '@lucide/svelte/icons/minus';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Delete from '@lucide/svelte/icons/delete';
	import Copy from '@lucide/svelte/icons/copy';
	import { finite, plain } from '../data-kit/index.js';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		title?: string;
		/** 4 to 7 letters, A to Z, any case. */
		answer?: string;
		hint?: string;
		/** Rows on the board, default 6 (clamped 1 to 10). */
		max_guesses?: number;
		/** Accepted for spec compatibility. No dictionary ships, so any letters are a valid guess. */
		allow_any_word?: boolean;
		/** Written by the widget on every guess and hint; bindable. */
		value?: WordGuessValue;
		onchange?: (value: WordGuessValue) => void;
		/** Fires once when the game ends. */
		oncomplete?: (result: { won: boolean; guesses: string[] }) => void;
	}

	let {
		id,
		class: className,
		style,
		title,
		answer,
		hint,
		max_guesses,
		value = $bindable(),
		onchange,
		oncomplete
	}: Props = $props();

	const rootStyle = $derived(
		style && typeof style === 'object'
			? safeStyle(Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';'))
			: safeStyle(typeof style === 'string' ? style : '')
	);

	const heading = $derived(plain(title));
	const hintText = $derived(plain(hint));
	const parsed = $derived(parseAnswer(answer));
	const word = $derived(parsed.word);
	const max = $derived(Math.min(10, Math.max(1, Math.round(finite(max_guesses) ?? 6))));

	interface Game {
		for: string;
		guesses: string[];
		typed: string;
		hintUsed: boolean;
	}
	let game = $state<Game>({ for: '', guesses: [], typed: '', hintUsed: false });
	const fresh = $derived(game.for !== word);
	const guesses = $derived(fresh ? [] : game.guesses);
	const typed = $derived(fresh ? '' : game.typed);
	const hintUsed = $derived(fresh ? false : game.hintUsed);

	const status = $derived<GameStatus>(
		guesses.at(-1) === word && guesses.length ? 'won' : guesses.length >= max ? 'lost' : 'playing'
	);
	const keys = $derived(keyStates(guesses, word));
	const rows = $derived(guesses.map((g) => ({ g, fb: score(g, word) })));

	/** Row just revealed (flips); never set at mount, so a re-send or SSR shows rows still. */
	let revealed = $state(-1);
	let shaking = $state(false);
	let notice = $state('');
	let announce = $state('');
	let copied = $state('');
	let endEl = $state<HTMLElement>();
	let hintEl = $state<HTMLElement>();

	/** The game for the current answer, started fresh if the answer changed. */
	function current(): Game {
		if (game.for !== word) {
			game = { for: word, guesses: [], typed: '', hintUsed: false };
			revealed = -1;
			copied = '';
		}
		return game;
	}

	function write() {
		const v: WordGuessValue = { guesses: [...guesses], status, hint_used: hintUsed };
		value = v;
		onchange?.(v);
	}

	function type(letter: string) {
		if (!word || status !== 'playing') return;
		const g = current();
		if (g.typed.length < word.length) g.typed += letter;
		notice = '';
		shaking = false;
	}

	function back() {
		if (!word || status !== 'playing') return;
		const g = current();
		g.typed = g.typed.slice(0, -1);
		notice = '';
	}

	async function submit() {
		if (!word || status !== 'playing') return;
		const g = current();
		if (g.typed.length < word.length) {
			notice = `Not enough letters. The word has ${word.length}.`;
			announce = notice;
			shaking = true;
			return;
		}
		const guess = g.typed;
		g.guesses = [...g.guesses, guess];
		g.typed = '';
		revealed = g.guesses.length - 1;
		notice = '';
		const fb = score(guess, word);
		const read = Array.from(guess, (l, i) => `${l} ${WORDS[fb[i]]}`).join(', ');
		const n = g.guesses.length;
		// Re-read after the guess lands (the guard above narrowed `status` to playing).
		const end = (status as GameStatus) === 'playing' ? undefined : (status as GameStatus);
		announce =
			end === 'won'
				? `${guess}: ${read}. Solved in ${n}.`
				: end === 'lost'
					? `${guess}: ${read}. Out of guesses. The word was ${word}.`
					: `Guess ${n} of ${max}, ${guess}: ${read}.`;
		write();
		if (end) {
			oncomplete?.({ won: end === 'won', guesses: [...g.guesses] });
			await tick();
			endEl?.focus();
		}
	}

	async function showHint() {
		if (!word || !hintText) return;
		const g = current();
		if (g.hintUsed) return;
		g.hintUsed = true;
		announce = `Hint: ${hintText}`;
		write();
		await tick();
		hintEl?.focus();
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		// Enter or Space on a focused button is that button's click; don't also submit.
		if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element | null)?.closest?.('button')) return;
		if (e.key === 'Enter') {
			e.preventDefault();
			void submit();
		} else if (e.key === 'Backspace') {
			e.preventDefault();
			back();
		} else if (/^[a-z]$/i.test(e.key)) {
			e.preventDefault();
			type(e.key.toUpperCase());
		}
	}

	// Spread, not attributes (as in CanvasViewport): svelte's a11y lint counts
	// role="application" as non-interactive, yet a focusable board that takes
	// every key is exactly what that role is for.
	const BOARD = { tabindex: 0, onkeydown };

	const share = $derived(
		status === 'playing'
			? ''
			: shareText({ title: heading || 'Word guess', guesses, answer: word, max, won: status === 'won', hintUsed })
	);

	async function copy() {
		try {
			if (!navigator.clipboard) throw new Error('no clipboard');
			await navigator.clipboard.writeText(share);
			copied = 'Copied';
		} catch {
			copied = 'Could not copy. Select the grid to copy it.';
		}
		announce = copied;
	}

	const GLYPH = { correct: Check, present: ArrowLeftRight, absent: Minus } as const;
	const TILE: Record<Feedback, string> = {
		correct: 'border-transparent bg-ripple-success text-ripple-success-foreground',
		present: 'border-transparent bg-ripple-warning text-ripple-warning-foreground',
		absent: 'border-transparent bg-ripple-muted text-ripple-muted-foreground'
	};

	const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring';
	const quiet = [
		'inline-flex h-9 items-center gap-1.5 rounded-md border border-ripple-border bg-ripple-surface px-3 text-callout hover:bg-ripple-muted',
		focusRing
	];
</script>

<div {id} class={['@container text-ripple-surface-foreground', className]} style={rootStyle} data-widget="word-guess">
	<div class="mx-auto flex max-w-[480px] flex-col gap-3">
		<header class="flex min-w-0 flex-col gap-0.5">
			<h2 class="text-title-3 font-semibold text-pretty">{heading || 'Word guess'}</h2>
			{#if word}
				<p class="text-footnote text-ripple-muted-foreground tabular-nums" data-slot="meta">
					{word.length} letters · {max} {max === 1 ? 'guess' : 'guesses'}
				</p>
			{/if}
		</header>

		{#if !word}
			<p class="rounded-ripple border border-ripple-border bg-ripple-surface px-3 py-4 text-callout text-ripple-muted-foreground" data-slot="invalid">
				{parsed.error}
			</p>
		{:else}
			<!-- The board takes physical keys while it (or one of its keys) has focus. -->
			<div
				role="application"
				{...BOARD}
				aria-label="Word guess board. Type letters, Enter to guess, Backspace to delete."
				class={['flex flex-col items-center gap-3 rounded-ripple p-1', focusRing]}
				data-slot="board"
			>
				<ol class="grid w-full justify-center gap-1.5" aria-label="Guesses" data-slot="grid">
					{#each Array.from({ length: max }, (_, r) => r) as r (r)}
						{@const played = rows[r]}
						{@const isTyping = !played && r === guesses.length && status === 'playing'}
						<li
							class={['grid gap-1.5', isTyping && shaking && 'wg-shake']}
							style:grid-template-columns="repeat({word.length}, minmax(0, 3.25rem))"
							aria-label={played ? `Guess ${r + 1}` : isTyping ? `Guess ${r + 1}, typing` : `Guess ${r + 1}, not played`}
							data-row={played ? 'played' : isTyping ? 'typing' : 'empty'}
							onanimationend={() => (shaking = false)}
						>
							{#each Array.from({ length: word.length }, (_, i) => i) as i (i)}
								{#if played}
									{@const f = played.fb[i]}
									{@const Glyph = GLYPH[f]}
									<span
										role="img"
										aria-label="{played.g[i]}, {WORDS[f]}"
										class={['relative grid aspect-square place-items-center rounded-md border-2 text-title-2 font-bold uppercase', TILE[f], r === revealed && 'wg-flip']}
										style:animation-delay={r === revealed ? `${i * 120}ms` : undefined}
										data-state={f}
									>
										{played.g[i]}
										<Glyph size={10} strokeWidth={3} aria-hidden="true" class="absolute top-1 right-1 opacity-80" />
									</span>
								{:else}
									{@const l = isTyping ? typed[i] : undefined}
									<span
										class={[
											'grid aspect-square place-items-center rounded-md border-2 bg-ripple-surface text-title-2 font-bold uppercase',
											l ? 'border-ripple-muted-foreground' : 'border-ripple-border'
										]}
										aria-hidden={!isTyping}
										aria-label={isTyping ? (l ?? 'empty') : undefined}
										role={isTyping ? 'img' : undefined}
										data-state={l ? 'typed' : 'empty'}
									>
										{l ?? ''}
									</span>
								{/if}
							{/each}
						</li>
					{/each}
				</ol>

				{#if notice}
					<p class="text-callout text-ripple-error-text" data-slot="notice">{notice}</p>
				{/if}

				{#if status === 'playing'}
					<div class="flex w-full flex-col gap-1.5" aria-label="Keyboard" role="group" data-slot="keyboard">
						{#each ROWS as row, ri (ri)}
							<div class="flex justify-center gap-1">
								{#if ri === 2}
									<button type="button" class={['h-12 rounded-md border border-ripple-border bg-ripple-surface px-2 text-caption-1 font-semibold hover:bg-ripple-muted', focusRing]} onclick={() => void submit()}>Enter</button>
								{/if}
								{#each row as k (k)}
									{@const f = keys[k]}
									{@const Glyph = f ? GLYPH[f] : undefined}
									<button
										type="button"
										class={[
											'relative h-12 max-w-10 min-w-0 flex-1 rounded-md border text-body-emph font-semibold',
											f ? TILE[f] : 'border-ripple-border bg-ripple-surface hover:bg-ripple-muted',
											focusRing
										]}
										aria-label={f ? `${k}, ${WORDS[f]}` : k}
										data-key={k}
										data-state={f ?? 'unused'}
										onclick={() => type(k)}
									>
										{k}
										{#if Glyph}<Glyph size={8} strokeWidth={3} aria-hidden="true" class="absolute top-0.5 right-0.5 opacity-80" />{/if}
									</button>
								{/each}
								{#if ri === 2}
									<button type="button" class={['grid h-12 place-items-center rounded-md border border-ripple-border bg-ripple-surface px-2 hover:bg-ripple-muted', focusRing]} aria-label="Delete letter" onclick={back}>
										<Delete size={18} strokeWidth={1.75} aria-hidden="true" />
									</button>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<p class="flex flex-wrap justify-center gap-x-3 gap-y-1 text-footnote text-ripple-muted-foreground" data-slot="legend">
				<span class="inline-flex items-center gap-1"><Check size={12} strokeWidth={2.5} aria-hidden="true" />correct spot</span>
				<span class="inline-flex items-center gap-1"><ArrowLeftRight size={12} strokeWidth={2.5} aria-hidden="true" />in word</span>
				<span class="inline-flex items-center gap-1"><Minus size={12} strokeWidth={2.5} aria-hidden="true" />not in word</span>
			</p>

			{#if hintText}
				{#if hintUsed}
					<p
						bind:this={hintEl}
						tabindex="-1"
						class="flex items-start gap-2 rounded-md bg-ripple-muted px-3 py-2 text-callout"
						data-slot="hint"
					>
						<Lightbulb size={14} strokeWidth={1.75} aria-hidden="true" class="mt-px shrink-0 text-ripple-warning-text" />{hintText}
					</p>
				{:else if status === 'playing'}
					<button type="button" class={[quiet, 'self-center']} onclick={showHint}>
						<Lightbulb size={14} strokeWidth={1.75} aria-hidden="true" />Show hint
					</button>
				{/if}
			{/if}

			{#if status !== 'playing'}
				<section class="flex flex-col items-center gap-2 rounded-ripple border border-ripple-border bg-ripple-surface p-4 text-center" aria-label="Result" data-slot="end">
					<h3 bind:this={endEl} tabindex="-1" class="text-title-3 font-semibold" data-slot="result">
						{status === 'won' ? `Solved in ${guesses.length}` : 'Out of guesses'}
					</h3>
					<p class="text-callout text-ripple-muted-foreground">
						The word was <strong class="font-semibold tracking-[0.08em] text-ripple-surface-foreground" data-slot="answer">{word}</strong>
					</p>
					<pre class="font-sans text-callout leading-tight" aria-label="Share grid" data-slot="share">{share}</pre>
					<button type="button" class={quiet} onclick={copy}>
						<Copy size={14} strokeWidth={2} aria-hidden="true" />Copy result
					</button>
					{#if copied}<p class="text-footnote text-ripple-muted-foreground" data-slot="copied">{copied}</p>{/if}
				</section>
			{/if}
		{/if}

		<p class="sr-only" aria-live="polite" data-slot="announce">{announce}</p>
	</div>
</div>

<style>
	.wg-flip {
		animation: wg-flip 480ms ease-in-out backwards;
	}
	@keyframes wg-flip {
		0% {
			transform: rotateX(0);
			background: var(--ripple-surface);
			color: var(--ripple-surface-foreground);
			border-color: var(--ripple-muted-foreground);
		}
		49% {
			background: var(--ripple-surface);
			color: var(--ripple-surface-foreground);
			border-color: var(--ripple-muted-foreground);
		}
		50% {
			transform: rotateX(90deg);
		}
		100% {
			transform: rotateX(0);
		}
	}
	.wg-shake {
		animation: wg-shake 360ms ease-in-out;
	}
	@keyframes wg-shake {
		20%,
		60% {
			transform: translateX(-6px);
		}
		40%,
		80% {
			transform: translateX(6px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.wg-flip,
		.wg-shake {
			animation: none;
		}
	}
</style>
