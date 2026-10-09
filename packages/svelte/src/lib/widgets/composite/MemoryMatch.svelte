<!--
  widgets/composite/MemoryMatch.svelte — `memory-match`: a card-flip pairs
  game the model fills with content (plan 2026-10-10, G1). The model writes
  `pairs` ({ id, a, b }, 6 to 12); the widget deals 2 cards per pair face
  down, flips two at a time, keeps matches face up with a check, flips a miss
  back after 800ms, counts moves and time, remembers the best moves this
  session, and ends on a win screen (or a time-up screen) with Play again.

  Invariants:
  - A side is plain text, a single emoji, or `icon:<key>` where the key is in
    one of the data kit's closed icon maps (ICONS below). An unknown key shows
    as the key's text. Never markup.
  - The deal is a seeded shuffle of the deck's content plus the game number,
    never Math.random: a re-sent spec (same content, new array identity)
    keeps the order and the play, and the server and client agree.
  - All play state is tagged with the deck signature; a genuinely new deck
    (or a deck still streaming in) reads as a fresh game.
  - `value` is the one bound field (default contract `value` / `onchange`):
    { moves, matched, completed, seconds }, written on each move, on the end
    of a game and on Play again, never on a timer tick.
  - `on_complete` fires once per won game with { moves, seconds }; time-up
    does not fire it.
  - Each card is a button named "Card 3, face down" / "Card 3, perro" /
    "Card 3, perro, matched"; a roving tabindex makes the grid one tab stop
    and arrows move focus. Reduced motion turns the flip into a fade.
-->
<script module lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import {
		STOP_ICONS,
		LEG_ICONS,
		MEAL_ICONS,
		AISLE_ICONS,
		MENU_ICONS,
		OPTION_ICONS,
		CHOICE_ICONS,
		SERVICE_ICONS,
		EXERCISE_ICONS,
		RECORD_ICONS,
		FEATURE_ICONS
	} from '../data-kit/icons.js';

	export interface MatchPair {
		id?: string;
		a: string;
		b: string;
	}
	export interface MemoryMatchValue {
		moves: number;
		matched: string[];
		completed: boolean;
		seconds: number;
	}
	export type Face = { kind: 'text' | 'emoji' | 'icon'; text: string; icon?: LucideIcon; fit?: number };

	/** Every key an `icon:<key>` side may name: the union of the kit's closed maps. */
	export const ICONS: Readonly<Record<string, LucideIcon>> = {
		...STOP_ICONS,
		...LEG_ICONS,
		...MEAL_ICONS,
		...AISLE_ICONS,
		...MENU_ICONS,
		...OPTION_ICONS,
		...CHOICE_ICONS,
		...SERVICE_ICONS,
		...EXERCISE_ICONS,
		...RECORD_ICONS,
		...FEATURE_ICONS
	};

	export const MIN_PAIRS = 2;
	export const MAX_PAIRS = 12;
	export const MISS_MS = 800;

	const EMOJI = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|‍|️|⃣|[#*0-9])+$/u;

	/** A side as shown: an icon from the closed maps, an emoji, or text with a fit factor for its font. */
	export function face(s: string): Face {
		if (s.toLowerCase().startsWith('icon:')) {
			const key = s.slice(5).trim().toLowerCase();
			if (Object.hasOwn(ICONS, key)) return { kind: 'icon', text: key, icon: ICONS[key] };
			s = key || s;
		}
		if (s.length <= 16 && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(s) && EMOJI.test(s)) return { kind: 'emoji', text: s };
		// Long words shrink: the longest word must fit one line, a phrase gets about 3 lines.
		const longest = Math.max(...s.split(/\s+/).map((w) => w.length));
		const len = Math.max(longest, Math.ceil(s.length / 3), 4);
		return { kind: 'text', text: s, fit: Math.round((150 / len) * 10) / 10 };
	}

	/** Columns for `cards` cards: about square, never more than 6. */
	export function autoColumns(cards: number): number {
		return cards <= 16 ? 4 : cards <= 20 ? 5 : 6;
	}

	export function clock(sec: number): string {
		const s = Math.max(0, Math.floor(sec));
		return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
	}

	function rec(v: unknown): Record<string, unknown> {
		return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
	}
	const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
</script>

<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { safeStyle } from '@ripple-ui/core';
	import Check from '@lucide/svelte/icons/check';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Timer from '@lucide/svelte/icons/timer';
	import Footprints from '@lucide/svelte/icons/footprints';
	import Star from '@lucide/svelte/icons/star';
	import Layers from '@lucide/svelte/icons/layers';
	import { safeArray } from '$lib/utils/safe-props.js';
	import { StatChip, plain, rise } from '../data-kit/index.js';
	import { shuffled } from './FlashcardDeck.svelte';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		title?: string;
		/** 6 to 12 pairs; each side is text, one emoji, or `icon:<key>`. */
		pairs?: MatchPair[];
		/** Grid columns; auto by card count. */
		columns?: number;
		/** Optional time limit in seconds; none by default. */
		time_limit_s?: number;
		/** { moves, matched, completed, seconds }, written by the widget; bindable. */
		value?: MemoryMatchValue;
		onchange?: (value: MemoryMatchValue) => void;
		/** Fires once per won game. */
		oncomplete?: (result: { moves: number; seconds: number }) => void;
	}

	let {
		id,
		class: className,
		style,
		title,
		pairs,
		columns,
		time_limit_s,
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

	const deck = $derived.by(() => {
		const list = safeArray<unknown>(pairs, { widget: 'memory-match', key: 'pairs' })
			.flatMap((raw, i) => {
				const p = rec(raw);
				const a = plain(str(p.a));
				const b = plain(str(p.b));
				if (!a || !b) return [];
				return [{ id: str(p.id) || String(i), a: face(a), b: face(b) }];
			})
			.slice(0, MAX_PAIRS);
		return { list, sig: JSON.stringify(list.map((p) => [p.id, p.a.text, p.b.text])) };
	});
	const playable = $derived(deck.list.length >= MIN_PAIRS);
	const cards = $derived(deck.list.flatMap((p, pair) => [{ pair, face: p.a }, { pair, face: p.b }]));

	type Progress = {
		sig: string;
		game: number;
		open: number[];
		matched: number[];
		moves: number;
		seconds: number;
		started: boolean;
		over: 'won' | 'time' | null;
	};
	const fresh = (sig: string, game = 0): Progress => ({ sig, game, open: [], matched: [], moves: 0, seconds: 0, started: false, over: null });

	let progress = $state<Progress | null>(null);
	let best = $state<{ sig: string; moves: number } | null>(null);
	let newBest = $state(false);
	let said = $state('');
	let focusAt = $state(0);
	let grid = $state<HTMLElement>();
	let again = $state<HTMLButtonElement>();
	let missTimer: ReturnType<typeof setTimeout> | undefined;

	const cur = $derived(progress?.sig === deck.sig ? progress : fresh(deck.sig));
	const order = $derived(shuffled(cards.map((_, i) => i), `${cur.game}|${deck.sig}`));
	const limit = $derived(typeof time_limit_s === 'number' && Number.isFinite(time_limit_s) && time_limit_s > 0 ? Math.round(time_limit_s) : 0);
	const cols = $derived(
		Math.min(
			typeof columns === 'number' && Number.isFinite(columns) && columns >= 2 ? Math.min(Math.round(columns), 8) : autoColumns(cards.length),
			Math.max(cards.length, 1)
		)
	);
	const bestMoves = $derived(best?.sig === deck.sig ? best.moves : undefined);
	const running = $derived(cur.started && cur.over === null);

	function set(p: Partial<Progress>) {
		progress = { ...cur, ...p };
	}

	function write(p: Progress) {
		const v: MemoryMatchValue = {
			moves: p.moves,
			matched: p.matched.map((i) => deck.list[i].id),
			completed: p.over === 'won',
			seconds: p.seconds
		};
		value = v;
		onchange?.(v);
	}

	const nameOf = (f: Face) => f.text;
	const label = (pos: number) => {
		const c = cards[order[pos]];
		const n = `Card ${pos + 1}`;
		if (cur.matched.includes(c.pair)) return `${n}, ${nameOf(c.face)}, matched`;
		return cur.open.includes(pos) ? `${n}, ${nameOf(c.face)}` : `${n}, face down`;
	};

	$effect(() => {
		if (!running) return;
		const t = setInterval(() => {
			const seconds = cur.seconds + 1;
			if (limit && seconds >= limit) {
				clearTimeout(missTimer);
				const next = { ...cur, seconds, open: [], over: 'time' as const };
				progress = next;
				write(next);
				said = `Time's up. ${next.matched.length} of ${deck.list.length} pairs found.`;
				void tick().then(() => again?.focus());
			} else set({ seconds });
		}, 1000);
		return () => clearInterval(t);
	});
	onDestroy(() => clearTimeout(missTimer));

	function flip(pos: number) {
		focusAt = pos;
		if (!playable || cur.over) return;
		const c = cards[order[pos]];
		if (!c || cur.matched.includes(c.pair) || cur.open.includes(pos)) return;
		let open = cur.open;
		// A third card while a miss is still showing: turn the miss back now.
		if (open.length === 2) {
			clearTimeout(missTimer);
			open = [];
		}
		if (open.length === 0) {
			set({ open: [pos], started: true });
			said = `Card ${pos + 1}: ${nameOf(c.face)}`;
			return;
		}
		const other = cards[order[open[0]]];
		const moves = cur.moves + 1;
		if (other.pair === c.pair) {
			const matched = [...cur.matched, c.pair];
			const won = matched.length === deck.list.length;
			const next: Progress = { ...cur, open: [], matched, moves, over: won ? 'won' : null };
			progress = next;
			write(next);
			said = `Match: ${nameOf(other.face)} and ${nameOf(c.face)}. ${matched.length} of ${deck.list.length} pairs found.`;
			if (won) {
				newBest = bestMoves !== undefined && moves < bestMoves;
				if (bestMoves === undefined || moves < bestMoves) best = { sig: deck.sig, moves };
				said += ` You won in ${moves} moves and ${clock(next.seconds)}.`;
				oncomplete?.({ moves, seconds: next.seconds });
				void tick().then(() => again?.focus());
			}
			return;
		}
		const next: Progress = { ...cur, open: [open[0], pos], moves };
		progress = next;
		write(next);
		said = `${nameOf(other.face)} and ${nameOf(c.face)}, no match.`;
		const { sig, game } = next;
		missTimer = setTimeout(() => {
			if (progress?.sig === sig && progress.game === game && progress.open.length === 2) progress = { ...progress, open: [] };
		}, MISS_MS);
	}

	function playAgain() {
		clearTimeout(missTimer);
		const next = fresh(deck.sig, cur.game + 1);
		progress = next;
		newBest = false;
		said = 'New game. Cards shuffled.';
		focusAt = 0;
		write(next);
		void tick().then(() => grid?.querySelector('button')?.focus());
	}

	/** Columns as laid out (a container query can narrow them); the JS count when the browser cannot say. */
	function laidOutColumns(): number {
		if (!grid || typeof getComputedStyle !== 'function') return cols;
		const tracks = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/);
		return tracks.length > 0 && tracks.every((t) => /^[\d.]+px$/.test(t)) ? tracks.length : cols;
	}

	function onkeydown(e: KeyboardEvent) {
		const n = cards.length;
		if (!n) return;
		const w = laidOutColumns();
		const from = Number((e.currentTarget as HTMLElement | null)?.dataset.pos ?? focusAt);
		const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: w, ArrowUp: -w };
		let to: number;
		if (e.key in step) to = from + step[e.key];
		else if (e.key === 'Home') to = 0;
		else if (e.key === 'End') to = n - 1;
		else return;
		e.preventDefault();
		if (to < 0 || to >= n) return;
		focusAt = to;
		(grid?.children[to] as HTMLElement | undefined)?.focus();
	}

	const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring';
	const primaryBtn = [
		'inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ripple-accent px-5 text-body-emph text-ripple-accent-foreground transition-opacity hover:opacity-90',
		focusRing
	];
</script>

{#snippet faceView(f: Face)}
	{#if f.kind === 'icon' && f.icon}
		{@const Icon = f.icon}
		<Icon class="mm-icon" strokeWidth={1.75} aria-hidden="true" />
	{:else if f.kind === 'emoji'}
		<span class="mm-emoji">{f.text}</span>
	{:else}
		<span class="mm-text font-semibold text-balance" style:--mm-fit={f.fit}>{f.text}</span>
	{/if}
{/snippet}

<div {id} class={['@container text-ripple-surface-foreground', className]} style={rootStyle} data-widget="memory-match">
	<div class="flex flex-col gap-3">
		{#if heading || playable}
			<header class="flex min-w-0 flex-col gap-0.5">
				{#if heading}<h2 class="text-title-3 font-semibold text-pretty">{heading}</h2>{/if}
				{#if playable}
					<p class="text-footnote text-ripple-muted-foreground tabular-nums" data-slot="meta">
						{deck.list.length} pairs · find the matching cards
					</p>
				{/if}
			</header>
		{/if}

		{#if !playable}
			<p class="rounded-ripple border border-ripple-border bg-ripple-surface px-3 py-4 text-callout text-ripple-muted-foreground">
				No pairs yet. Ask for a matching game.
			</p>
		{:else}
			<div class="grid grid-cols-2 gap-2 @min-[480px]:grid-cols-4" data-slot="stats">
				<StatChip label="Moves" value={cur.moves} icon={Footprints} />
				<StatChip label={limit ? 'Time left' : 'Time'} value={clock(limit ? limit - cur.seconds : cur.seconds)} icon={Timer} />
				<StatChip label="Pairs" value={`${cur.matched.length} / ${deck.list.length}`} icon={Layers} />
				<StatChip label="Best" value={bestMoves === undefined ? 'n/a' : bestMoves} unit={bestMoves === undefined ? undefined : 'moves'} icon={Star} />
			</div>

			{#if cur.over}
				<section
					class="relative flex flex-col items-center gap-3 overflow-hidden rounded-ripple border border-ripple-border bg-ripple-surface px-4 py-8 text-center"
					aria-label={cur.over === 'won' ? 'You won' : "Time's up"}
					data-slot="end"
					data-end={cur.over}
					in:rise={{ index: 0 }}
				>
					{#if cur.over === 'won'}
						<div class="mm-burst" aria-hidden="true">
							{#each Array.from({ length: 12 }, (_, k) => k) as k (k)}<span style:--k={k}></span>{/each}
						</div>
						<span class="grid size-12 place-items-center rounded-full bg-ripple-success/12 text-ripple-success-text">
							<Trophy size={24} strokeWidth={1.75} aria-hidden="true" />
						</span>
						<p class="text-title-3 font-semibold">All {deck.list.length} pairs matched</p>
						<p class="text-callout text-ripple-muted-foreground tabular-nums" data-slot="result">
							{cur.moves} moves in {clock(cur.seconds)}{newBest ? ' · new best' : ''}
						</p>
					{:else}
						<span class="grid size-12 place-items-center rounded-full bg-ripple-muted text-ripple-muted-foreground">
							<Timer size={24} strokeWidth={1.75} aria-hidden="true" />
						</span>
						<p class="text-title-3 font-semibold">Time's up</p>
						<p class="text-callout text-ripple-muted-foreground tabular-nums" data-slot="result">
							{cur.matched.length} of {deck.list.length} pairs in {cur.moves} moves
						</p>
					{/if}
					<button type="button" class={primaryBtn} bind:this={again} onclick={playAgain}>
						<RotateCcw size={16} strokeWidth={2} aria-hidden="true" />Play again
					</button>
				</section>
			{:else}
				<div
					bind:this={grid}
					class="mm-grid mx-auto grid w-full gap-2"
					style:--mm-cols={cols}
					style:--mm-narrow={Math.min(cols, 4)}
					role="group"
					aria-label={heading ? `${heading} cards` : 'Cards'}
					data-slot="grid"
				>
					{#each order as cardIdx, pos (`${cur.game}:${cardIdx}`)}
						{@const c = cards[cardIdx]}
						{@const isMatched = cur.matched.includes(c.pair)}
						{@const up = isMatched || cur.open.includes(pos)}
						<button
							type="button"
							class={['mm-card rounded-ripple', focusRing]}
							data-pos={pos}
							data-up={up}
							data-matched={isMatched}
							data-miss={cur.open.length === 2 && cur.open.includes(pos)}
							tabindex={pos === focusAt ? 0 : -1}
							aria-label={label(pos)}
							aria-disabled={isMatched || undefined}
							onclick={() => flip(pos)}
							{onkeydown}
						>
							<span class="mm-inner" aria-hidden="true">
								<span class="mm-face mm-back rounded-ripple border border-ripple-accent/30">
									<span class="mm-dot"></span>
								</span>
								<span
									class={[
										'mm-face mm-front rounded-ripple border p-1.5',
										isMatched ? 'border-ripple-success/50 bg-ripple-success/12' : 'border-ripple-border bg-ripple-surface'
									]}
								>
									{@render faceView(c.face)}
									{#if isMatched}
										<span class="absolute top-1 right-1 text-ripple-success-text"><Check size={14} strokeWidth={2.25} /></span>
									{/if}
								</span>
							</span>
						</button>
					{/each}
				</div>
				<p class="text-center text-footnote text-ripple-muted-foreground">Flip two cards to find a pair. Arrow keys move, Enter flips.</p>
			{/if}
		{/if}

		<p class="sr-only" aria-live="polite" data-slot="live">{said}</p>
	</div>
</div>

<style>
	.mm-grid {
		grid-template-columns: repeat(var(--mm-cols), minmax(0, 1fr));
		max-width: calc(var(--mm-cols) * 128px);
	}
	@container (max-width: 479px) {
		.mm-grid {
			grid-template-columns: repeat(var(--mm-narrow), minmax(0, 1fr));
		}
	}
	.mm-card {
		container-type: inline-size;
		aspect-ratio: 4 / 5;
		perspective: 900px;
		cursor: pointer;
	}
	.mm-card[data-matched='true'] {
		cursor: default;
	}
	.mm-inner {
		display: grid;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
		transition: transform 380ms cubic-bezier(0.2, 0.7, 0.2, 1);
	}
	.mm-card[data-up='true'] .mm-inner {
		transform: rotateY(180deg);
	}
	.mm-face {
		position: relative;
		grid-area: 1 / 1;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}
	.mm-back {
		background: color-mix(in oklab, var(--ripple-accent) 14%, var(--ripple-surface));
	}
	.mm-card:hover .mm-back {
		background: color-mix(in oklab, var(--ripple-accent) 20%, var(--ripple-surface));
	}
	.mm-dot {
		width: 22%;
		aspect-ratio: 1;
		border-radius: 999px;
		border: 2px solid color-mix(in oklab, var(--ripple-accent) 45%, transparent);
	}
	.mm-front {
		transform: rotateY(180deg);
	}
	.mm-card[data-miss='true'] .mm-front {
		border-color: color-mix(in oklab, var(--ripple-error) 50%, transparent);
	}
	.mm-text {
		/* Autoscale: --mm-fit is about 150 / (longest word), in container units. */
		font-size: clamp(10px, calc(var(--mm-fit, 20) * 1cqi), 24px);
		line-height: 1.15;
		text-align: center;
		overflow-wrap: anywhere;
		hyphens: auto;
	}
	.mm-emoji {
		font-size: clamp(20px, 46cqi, 52px);
		line-height: 1;
	}
	.mm-front :global(.mm-icon) {
		width: clamp(20px, 42cqi, 48px);
		height: clamp(20px, 42cqi, 48px);
	}
	.mm-burst {
		position: absolute;
		top: 3.5rem;
		left: 50%;
		pointer-events: none;
	}
	.mm-burst span {
		position: absolute;
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--ripple-accent);
		opacity: 0;
		animation: mm-burst 900ms cubic-bezier(0.2, 0.7, 0.2, 1) 120ms both;
	}
	.mm-burst span:nth-child(3n) {
		background: var(--ripple-success);
	}
	.mm-burst span:nth-child(3n + 1) {
		background: var(--ripple-warning);
	}
	@keyframes mm-burst {
		0% {
			opacity: 1;
			transform: rotate(calc(var(--k) * 30deg)) translateY(0) scale(1);
		}
		100% {
			opacity: 0;
			transform: rotate(calc(var(--k) * 30deg)) translateY(-56px) scale(0.6);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.mm-inner,
		.mm-card[data-up='true'] .mm-inner,
		.mm-front {
			transform: none;
			transition: none;
		}
		.mm-face {
			transition: opacity 160ms ease-out;
		}
		.mm-front,
		.mm-card[data-up='true'] .mm-back {
			opacity: 0;
		}
		.mm-card[data-up='true'] .mm-front {
			opacity: 1;
		}
		.mm-burst {
			display: none;
		}
	}
</style>
