<!--
  widgets/composite/FlashcardDeck.svelte — `flashcard-deck`: a study deck the
  visitor flips through and marks "Got it" or "Missed it" (design doc
  2026-10-09 §3.9). Progress dots, the card, the two marks, then a score
  screen listing what was missed, with "Practise missed" (a re-deal of only
  those cards) and Restart.

  Built on the kit, not on the `flashcard` widget: that one hardcodes
  red/green shadcn colours, keeps its flip state private and has no
  reduced-motion path.

  Invariants:
  - `score` is the one bound field (bind contract `score` / `onscorechange`):
    the number of cards known since the last restart, written by the widget.
    `on_complete` fires at the end of every pass with `{ score, total }`.
  - The deal derives from `cards` until the visitor re-deals, so a streamed
    deck ends equal to a whole one. `shuffle` is seeded from the cards' text
    and the pass number, never Math.random, so the server, the client and two
    mounts all agree on the order.
  - Each card is its own node ({#key pos}), so marking a flipped card never
    rotates back over the next card's answer.
  - Reduced motion turns the 3D flip into a cross-fade (CSS only).
-->
<script module lang="ts">
	export interface DeckCard {
		id?: string;
		front: string;
		back: string;
		hint?: string;
		category?: string;
	}
	export type Mark = 'got' | 'missed';

	/** A seeded Fisher-Yates: the same seed gives the same order everywhere. */
	export function shuffled<T>(items: readonly T[], seed: string): T[] {
		let h = 2166136261;
		for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
		const rand = () => {
			h = (h + 0x6d2b79f5) | 0;
			let t = Math.imul(h ^ (h >>> 15), 1 | h);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		const out = [...items];
		for (let i = out.length - 1; i > 0; i--) {
			const j = Math.floor(rand() * (i + 1));
			[out[i], out[j]] = [out[j], out[i]];
		}
		return out;
	}

	function rec(v: unknown): Record<string, unknown> {
		return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
	}
</script>

<script lang="ts">
	import { safeStyle } from '@ripple-ui/core';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Repeat from '@lucide/svelte/icons/repeat';
	import Layers from '@lucide/svelte/icons/layers';
	import { safeArray } from '$lib/utils/safe-props.js';
	import { StatChip, VerdictLine, plain, rise } from '../data-kit/index.js';
	import type { Verdict } from '../data-kit/types.js';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		title?: string;
		subtitle?: string;
		verdict?: Verdict;
		cards?: DeckCard[];
		/** Deal in a seeded shuffled order (a new order on every restart). */
		shuffle?: boolean;
		/** Cards known since the last restart. Written by the widget; bindable. */
		score?: number;
		onscorechange?: (score: number) => void;
		/** Fires at the end of every pass. */
		oncomplete?: (result: { score: number; total: number }) => void;
	}

	let {
		id,
		class: className,
		style,
		title,
		subtitle,
		verdict,
		cards,
		shuffle = false,
		score = $bindable(),
		onscorechange,
		oncomplete
	}: Props = $props();

	const rootStyle = $derived(
		style && typeof style === 'object'
			? safeStyle(Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';'))
			: safeStyle(typeof style === 'string' ? style : '')
	);

	const heading = $derived(plain(title));
	const sub = $derived(plain(subtitle));

	const list = $derived(
		safeArray<unknown>(cards, { widget: 'flashcard-deck', key: 'cards' }).flatMap((raw, i) => {
			const c = rec(raw);
			const front = plain(c.front);
			if (!front) return [];
			return [{ key: `${c.id ?? ''}:${i}`, front, back: plain(c.back), hint: plain(c.hint), category: plain(c.category) }];
		})
	);

	/** Card indices of a re-deal ("Practise missed"); null deals the whole deck. */
	let practise = $state<number[] | null>(null);
	/** Passes since mount; seeds the shuffle so each pass gets a new order. */
	let pass = $state(0);
	let results = $state<Mark[]>([]);
	let known = $state<number[]>([]);
	let flipped = $state(false);
	let hintOpen = $state(false);

	const order = $derived.by(() => {
		const base = practise ? practise.filter((i) => i < list.length) : list.map((_, i) => i);
		return shuffle === true ? shuffled(base, `${pass}|${list.map((c) => c.front).join('|')}`) : base;
	});
	const pos = $derived(results.length);
	const done = $derived(order.length > 0 && pos >= order.length);
	const cardAt = $derived(order[pos] as number | undefined);
	const card = $derived(cardAt === undefined ? undefined : list[cardAt]);
	const got = $derived(results.filter((r) => r === 'got').length);
	const missed = $derived(pos - got);
	const unknown = $derived(list.flatMap((_, i) => (known.includes(i) ? [] : [i])));

	function writeScore(v: number) {
		score = v;
		onscorechange?.(v);
	}

	function reset() {
		results = [];
		flipped = false;
		hintOpen = false;
	}

	function mark(m: Mark) {
		if (cardAt === undefined || done) return;
		const i = cardAt;
		results = [...results, m];
		flipped = false;
		hintOpen = false;
		if (m === 'got' && !known.includes(i)) {
			known = [...known, i];
			writeScore(known.length);
		}
		if (results.length >= order.length) oncomplete?.({ score: known.length, total: list.length });
	}

	function practiseMissed() {
		practise = unknown;
		pass += 1;
		reset();
	}

	function restart() {
		practise = null;
		pass += 1;
		reset();
		if (known.length) {
			known = [];
			writeScore(0);
		}
	}

	const live = $derived(done ? `Deck complete. ${known.length} of ${list.length} known.` : '');

	const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring';
	const markBtn = [
		'inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ripple-border bg-ripple-surface text-body-emph transition-colors duration-150 hover:bg-ripple-muted disabled:opacity-40 motion-reduce:transition-none',
		focusRing
	];
	const primaryBtn = [
		'inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ripple-accent px-4 text-body-emph text-ripple-accent-foreground transition-opacity hover:opacity-90',
		focusRing
	];
</script>

<div {id} class={['@container text-ripple-surface-foreground', className]} style={rootStyle} data-widget="flashcard-deck">
	<div class="flex flex-col gap-3">
		{#if heading || sub || list.length}
			<header class="flex min-w-0 flex-col gap-0.5">
				{#if heading}<h2 class="text-title-3 font-semibold text-pretty">{heading}</h2>{/if}
				{#if sub}<p class="text-callout text-ripple-muted-foreground">{sub}</p>{/if}
				{#if list.length}
					<p class="text-footnote text-ripple-muted-foreground tabular-nums" data-slot="meta">
						{list.length} {list.length === 1 ? 'card' : 'cards'}{practise ? ` · practising ${order.length} missed` : ''}
					</p>
				{/if}
			</header>
		{/if}

		<VerdictLine {verdict} />

		{#if !list.length}
			<p class="rounded-ripple border border-ripple-border bg-ripple-surface px-3 py-4 text-callout text-ripple-muted-foreground">
				No cards yet. Ask for a deck.
			</p>
		{:else if done}
			<section
				class="grid gap-4 rounded-ripple border border-ripple-border bg-ripple-surface p-4 @min-[720px]:grid-cols-2 @min-[720px]:gap-6"
				aria-label="Score"
				data-slot="score"
				in:rise={{ index: 0 }}
			>
				<div class="flex flex-col items-center gap-3 text-center @min-[720px]:justify-center">
					<p class="text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase">Cards known</p>
					<p class="tabular-nums" data-slot="total">
						<span class="text-[44px] leading-none font-semibold">{known.length}</span>
						<span class="text-title-2 text-ripple-muted-foreground">/ {list.length}</span>
					</p>
					<div class="flex h-1.5 w-full max-w-60 overflow-hidden rounded-full bg-ripple-error/40" aria-hidden="true">
						<div class="h-full bg-ripple-success" style:width="{(known.length / list.length) * 100}%"></div>
					</div>
					{#if practise}
						<p class="text-callout text-ripple-muted-foreground tabular-nums">This round: {got} of {order.length}</p>
					{/if}
					<div class="flex w-full max-w-72 flex-col gap-2">
						{#if unknown.length}
							<button type="button" class={primaryBtn} onclick={practiseMissed}>
								<Repeat size={16} strokeWidth={2} aria-hidden="true" />Practise missed ({unknown.length})
							</button>
							<button type="button" class={markBtn} onclick={restart}>
								<RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />Restart
							</button>
						{:else}
							<button type="button" class={primaryBtn} onclick={restart}>
								<RotateCcw size={16} strokeWidth={2} aria-hidden="true" />Restart
							</button>
						{/if}
					</div>
				</div>

				<div class="flex min-w-0 flex-col gap-2">
					{#if unknown.length}
						<p class="text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase">To practise</p>
						<ul class="flex flex-col divide-y divide-ripple-border" data-slot="missed">
							{#each unknown as i, k (list[i].key)}
								<li class="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0" in:rise={{ index: k }}>
									<span class="grid size-8 shrink-0 place-items-center rounded-md bg-ripple-error/12 text-ripple-error-text">
										<X size={16} strokeWidth={1.75} aria-hidden="true" />
									</span>
									<span class="min-w-0 flex-1">
										<span class="block text-body-emph text-pretty">{list[i].front}</span>
										<span class="block text-callout text-pretty text-ripple-muted-foreground">{list[i].back || 'No answer given'}</span>
									</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="flex items-center gap-2 rounded-md bg-ripple-success/12 px-3 py-2.5 text-body-emph text-ripple-success-text">
							<Check size={16} strokeWidth={2} aria-hidden="true" />Every card known.
						</p>
					{/if}
				</div>
			</section>
		{:else if card}
			<div class="grid gap-3 @min-[720px]:grid-cols-[minmax(0,560px)_minmax(9rem,12rem)] @min-[720px]:justify-center @min-[720px]:gap-4">
				<div class="flex min-w-0 flex-col gap-3">
					<div class="flex items-center gap-3">
						<ol class="flex min-w-0 flex-1 flex-wrap gap-1.5" aria-label="Progress" data-slot="dots">
							{#each order as _, k (k)}
								{@const r = results[k]}
								<li
									class={[
										'size-2 rounded-full',
										r === 'got'
											? 'bg-ripple-success'
											: r === 'missed'
												? 'bg-ripple-error'
												: k === pos
													? 'bg-ripple-accent ring-2 ring-ripple-accent/30'
													: 'bg-ripple-border'
									]}
									data-mark={r ?? (k === pos ? 'now' : 'todo')}
								>
									<span class="sr-only">Card {k + 1}: {r === 'got' ? 'got it' : r === 'missed' ? 'missed' : k === pos ? 'current' : 'to do'}</span>
								</li>
							{/each}
						</ol>
						<span class="shrink-0 text-footnote text-ripple-muted-foreground tabular-nums" data-slot="position">{pos + 1} / {order.length}</span>
					</div>

					<!-- A new card is a new node, so it never un-flips on screen (that would flash its answer). -->
					{#key pos}
					<button
						type="button"
						class={['deck-card w-full rounded-ripple text-center', focusRing]}
						data-flipped={flipped}
						onclick={() => (flipped = !flipped)}
						in:rise
					>
						<span class="deck-inner">
							<span
								class="deck-face deck-front flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-ripple border border-ripple-border bg-ripple-surface p-5 @min-[560px]:min-h-[220px]"
								aria-hidden={flipped}
							>
								{#if card.category}
									<span class="text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase">{card.category}</span>
								{/if}
								<span class="text-title-2 font-semibold text-balance" data-slot="front">{card.front}</span>
								<span class="inline-flex items-center gap-1.5 text-footnote text-ripple-muted-foreground">
									<RotateCw size={12} strokeWidth={1.75} aria-hidden="true" />Tap to see the answer
								</span>
							</span>
							<span
								class="deck-face deck-back flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-ripple border border-ripple-accent/40 bg-[color-mix(in_oklab,var(--ripple-accent)_8%,var(--ripple-surface))] p-5 @min-[560px]:min-h-[220px]"
								aria-hidden={!flipped}
							>
								<span class="text-callout text-pretty text-ripple-muted-foreground">{card.front}</span>
								<span class="text-title-2 font-semibold text-balance" data-slot="back">{card.back || 'No answer given'}</span>
							</span>
						</span>
					</button>
					{/key}

					{#if card.hint && !flipped}
						{#if hintOpen}
							<p class="flex items-start gap-2 rounded-md bg-ripple-muted px-3 py-2 text-callout" data-slot="hint">
								<Lightbulb size={14} strokeWidth={1.75} aria-hidden="true" class="mt-px shrink-0 text-ripple-warning-text" />{card.hint}
							</p>
						{:else}
							<button
								type="button"
								class={['inline-flex h-7 items-center gap-1.5 self-center rounded-md px-2 text-callout text-ripple-muted-foreground hover:text-ripple-surface-foreground', focusRing]}
								onclick={() => (hintOpen = true)}
							>
								<Lightbulb size={14} strokeWidth={1.75} aria-hidden="true" />Show hint
							</button>
						{/if}
					{/if}

					<div class="grid grid-cols-2 gap-2">
						<button type="button" class={markBtn} onclick={() => mark('missed')}>
							<X size={16} strokeWidth={2} aria-hidden="true" class="text-ripple-error-text" />Missed it
						</button>
						<button type="button" class={markBtn} onclick={() => mark('got')}>
							<Check size={16} strokeWidth={2} aria-hidden="true" class="text-ripple-success-text" />Got it
						</button>
					</div>

					<p class="text-center text-footnote text-ripple-muted-foreground tabular-nums @min-[720px]:hidden" data-slot="tally">
						{got} got it · {missed} missed · {order.length - pos} left
					</p>
				</div>

				<aside class="hidden flex-col gap-2 @min-[720px]:flex" aria-label="This round">
					<StatChip label="Got it" value={got} icon={Check} />
					<StatChip label="Missed" value={missed} icon={X} />
					<StatChip label="Left" value={order.length - pos} icon={Layers} />
				</aside>
			</div>
		{/if}

		<p class="sr-only" aria-live="polite">{live}</p>
	</div>
</div>

<style>
	.deck-card {
		perspective: 1200px;
	}
	.deck-inner {
		display: grid;
		transform-style: preserve-3d;
		transition: transform 450ms cubic-bezier(0.2, 0.7, 0.2, 1);
	}
	.deck-card[data-flipped='true'] .deck-inner {
		transform: rotateY(180deg);
	}
	.deck-face {
		grid-area: 1 / 1;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}
	.deck-back {
		transform: rotateY(180deg);
	}
	@media (prefers-reduced-motion: reduce) {
		.deck-inner,
		.deck-card[data-flipped='true'] .deck-inner,
		.deck-back {
			transform: none;
			transition: none;
		}
		.deck-face {
			transition: opacity 160ms ease-out;
		}
		.deck-back,
		.deck-card[data-flipped='true'] .deck-front {
			opacity: 0;
		}
		.deck-card[data-flipped='true'] .deck-back {
			opacity: 1;
		}
	}
</style>
