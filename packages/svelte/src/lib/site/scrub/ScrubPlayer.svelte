<!--
  @file lib/site/scrub/ScrubPlayer.svelte
  @description A recorded model stream you can scrub: the spec JSON so far
    (token-coloured, caret at the cut) beside the real <Ripple> render of that
    prefix, over a timeline with play/pause, replay, speed, time and bytes.
    Shared by the home hero and /live.
    - Position is a clock in ms; scrub-model maps it to a chunk count and a
      cached partial spec. Ripple gets a hand-built streaming store whose phase
      is 'active' until the last chunk, so mid-stream placeholders apply.
    - SSR renders the `start` frame (a fraction of the duration), and the client
      computes the same frame, so hydration adopts the prerendered DOM. Autoplay
      and the reduced-motion jump to the end run after mount, as updates.
    - Keys (Space, arrows, Home/End) are bound on the slider only: the render
      pane holds live inputs that need the same keys.
    - The JSON pane scrolls in a column-reverse box, so it opens at the caret
      with JavaScript off and stays pinned there as text arrives. It indents
      1ch per level, so a deep spec keeps its text near the left edge.
    - Narrow (container under 760px): the render comes first and the spec
      folds under it in a <details>, open in the prerender. Wide: spec left,
      render right, the summary hidden while open.
    - A fixture change resets the clock and remounts Ripple (fresh app state).
    - Optional host hooks: `onEvent` goes to Ripple as-is (its return value is
      the action result, so a spec's on_error runs); `panes` ('render',
      'spec' or 'none') overrides the fold and the split at every width, so
      a page can drive its own tabs, and 'both' (default) keeps them; `autoplayFrom`
      moves the clock when autoplay starts, so the markup can hold the
      finished frame while the visit plays from the first byte;
      `holdSkeleton` keeps the skeleton up mid-stream until the spec has a
      `ui` (or `intent`), since a stream that opens with a long `state` block
      otherwise shows an empty pane.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Ripple from '$lib/Ripple.svelte';
	import type { StreamSpecStore } from '$lib/streaming/types.js';
	import type { OnEventCallback } from '$lib/index.js';
	import JsonLines from '../JsonLines.svelte';
	import { createScrubModel, type Recording } from './scrub-model.js';

	interface Props {
		fixture: Recording;
		/** Start frame as a fraction of the duration, 0..1. Prerendered. */
		start?: number;
		autoplay?: boolean;
		speed?: number;
		/** Figure caption, e.g. "fig. 1, bill splitter, 2,794 chars". */
		caption?: string;
		class?: string;
		/** Host handler for the render's events; its result goes back to Ripple. */
		onEvent?: OnEventCallback;
		/** Which panes to show. Default both (stacked when narrow). */
		panes?: 'both' | 'render' | 'spec' | 'none';
		/** Where autoplay starts, as a fraction. Default: wherever `start` put the clock. */
		autoplayFrom?: number;
		/** Mid-stream, show the skeleton until the spec has something to render. */
		holdSkeleton?: boolean;
	}

	let { fixture, start = 0.5, autoplay = false, speed = 1, caption, class: className = '', onEvent, panes = 'both', autoplayFrom, holdSkeleton = false }: Props = $props();

	const SPEEDS = [0.5, 1, 2];
	const model = $derived(createScrubModel(fixture));
	// Writable deriveds: reset when the fixture (or prop) changes, assignable otherwise.
	let ms = $derived(Math.min(1, Math.max(0, start)) * model.duration);
	let rate = $derived(speed);
	let playing = $state(false);
	let dragging = $state(false);

	const count = $derived(model.countAt(ms));
	const text = $derived(model.text(count));
	const atEnd = $derived(count === model.total);
	const shown = $derived.by(() => {
		const s = model.spec(count);
		return holdSkeleton && !atEnd && s && !('ui' in s && s.ui) && !('intent' in s && s.intent) ? null : s;
	});
	const store: StreamSpecStore = $derived({ current: shown, done: atEnd, error: null, cancel() {} });
	const pct = $derived(model.duration ? (ms / model.duration) * 100 : 0);

	// Fixed locale so the server and the browser print the same text.
	const secs = (v: number) => (v / 1000).toFixed(1);
	const num = (v: number) => v.toLocaleString('en-US');

	$effect(() => {
		if (!playing) return;
		let last = performance.now();
		let id = requestAnimationFrame(function step(now) {
			const next = ms + (now - last) * rate;
			last = now;
			if (next >= model.duration) {
				ms = model.duration;
				playing = false;
				return;
			}
			ms = next;
			id = requestAnimationFrame(step);
		});
		return () => cancelAnimationFrame(id);
	});

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) ms = model.duration;
		else if (autoplay) {
			if (autoplayFrom != null) ms = Math.min(1, Math.max(0, autoplayFrom)) * model.duration;
			playing = true;
		}
	});

	function toggle() {
		if (!playing && atEnd) ms = 0;
		playing = !playing;
	}

	function replay() {
		ms = 0;
		playing = true;
	}

	// Drag: pointermoves coalesce into one seek per frame, so a 120 Hz pointer
	// doesn't flush 120 Ripple renders a second.
	let track: HTMLDivElement | undefined = $state();
	let resume = false;
	let pendingX = 0;
	let seekFrame = 0;

	function seekTo(x: number) {
		pendingX = x;
		if (seekFrame) return;
		seekFrame = requestAnimationFrame(() => {
			seekFrame = 0;
			if (!track) return;
			const r = track.getBoundingClientRect();
			ms = Math.min(1, Math.max(0, (pendingX - r.left) / r.width)) * model.duration;
		});
	}

	function onpointerdown(e: PointerEvent) {
		if (e.button !== 0) return;
		// No text selection: a press on selected text starts a native drag,
		// which cancels the pointer and kills the scrub.
		e.preventDefault();
		track?.setPointerCapture(e.pointerId);
		// Keys work after a drag, without a keyboard focus ring on a mouse grab.
		track?.focus({ focusVisible: false } as FocusOptions);
		resume = playing;
		playing = false;
		dragging = true;
		seekTo(e.clientX);
	}

	function onpointermove(e: PointerEvent) {
		if (dragging) seekTo(e.clientX);
	}

	function onpointerup() {
		if (!dragging) return;
		dragging = false;
		if (resume && !atEnd) playing = true;
	}

	function onkeydown(e: KeyboardEvent) {
		const go = (c: number) => {
			playing = false;
			ms = model.msFor(c);
		};
		if (e.key === ' ' || e.key === 'k') toggle();
		else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') go(model.step(count, -1));
		else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') go(model.step(count, 1));
		else if (e.key === 'Home') go(0);
		else if (e.key === 'End') go(model.total);
		else return;
		e.preventDefault();
	}
</script>

<figure class="scrub {className}" class:playing>
	<div class="panes" data-show={panes}>
		<div class="render" data-pagefind-ignore="all">
			{#key model}
				<Ripple streaming={store} skeleton="card" {onEvent} />
			{/key}
		</div>
		<!-- Set only on a pane change, so a reader's fold survives; the Spec tab reopens it. -->
		<details class="spec" open={panes !== 'render'}>
			<summary>
				<span>Spec so far</span>
				<span class="summary-bytes">{num(model.bytes(count))} B</span>
			</summary>
			<!-- A scroll region must take focus to be keyboard-scrollable. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="json" role="region" aria-label="Spec received so far" tabindex="0">
				<pre><JsonLines {text} highlight caret indent={1} /></pre>
			</div>
		</details>
	</div>

	<div class="controls">
		<button type="button" class="ctl" onclick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
			{#if playing}<Pause size={16} aria-hidden="true" />{:else}<Play size={16} aria-hidden="true" />{/if}
		</button>
		<button type="button" class="ctl" onclick={replay} aria-label="Replay from the start">
			<RotateCcw size={16} aria-hidden="true" />
		</button>
		<div
			bind:this={track}
			class="track"
			class:dragging
			role="slider"
			tabindex="0"
			aria-label="Stream position"
			aria-valuemin={0}
			aria-valuemax={Number(secs(model.duration))}
			aria-valuenow={Number(secs(ms))}
			aria-valuetext="{secs(ms)} of {secs(model.duration)} seconds"
			style:--pct="{pct}%"
			{onpointerdown}
			{onpointermove}
			{onpointerup}
			onpointercancel={onpointerup}
			{onkeydown}
		>
			<span class="rail"><span class="fill"></span></span>
			<span class="head"></span>
		</div>
		<span class="meta">
			<span>{secs(ms)}s / {secs(model.duration)}s</span>
			<span>{num(model.bytes(count))} / {num(model.totalBytes)} B</span>
		</span>
		<div class="speed" role="group" aria-label="Playback speed">
			{#each SPEEDS as s}
				<button type="button" aria-pressed={rate === s} onclick={() => (rate = s)}>{s}x</button>
			{/each}
		</div>
	</div>

	{#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

<style>
	.scrub {
		--scrub-h: 460px;
		container-type: inline-size;
		margin: 0;
		font-family: var(--font-sans);
		color: var(--site-ink);
	}

	/* Narrow: the render on top, the spec under it in a <details> the reader
	   can fold away (open in the prerender, so JS-off shows both). Wide: the
	   spec on the left, the render on the right, the summary hidden. */
	.panes {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		overflow: hidden;
		background: var(--card);
	}

	.spec {
		border-top: 1px solid var(--site-line);
		background: var(--code-bg);
	}
	summary {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 16px;
		font: 12px/1 var(--font-mono);
		color: var(--site-soft);
		cursor: pointer;
		list-style: none;
		user-select: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	/* A chevron in CSS: points right when folded, down when open. */
	summary::before {
		content: '';
		width: 6px;
		height: 6px;
		margin-right: 2px;
		border: solid currentColor;
		border-width: 0 1.5px 1.5px 0;
		transform: rotate(-45deg);
		transition: transform var(--dur-mount) var(--ease-out-quart);
	}
	.spec[open] summary::before {
		transform: rotate(45deg);
	}
	.summary-bytes {
		margin-left: auto;
		font-variant-numeric: tabular-nums;
	}
	summary:hover {
		color: var(--site-ink);
	}
	summary:focus-visible {
		outline: none;
		box-shadow: inset 0 0 0 2px var(--ring);
	}
	.spec[open] summary {
		border-bottom: 1px solid var(--site-line);
	}

	/* `panes` (a page's own tabs) wins at every width; 'both' keeps the
	   narrow fold and the wide split. A single pane takes the whole box, and
	   the Spec tab shows the JSON without the fold's summary. These outrank
	   the container query below. */
	.panes[data-show='none'],
	.panes[data-show='render'] .spec,
	.panes[data-show='spec'] .render,
	.panes[data-show='spec'] summary {
		display: none;
	}
	.panes[data-show='render'],
	.panes[data-show='spec'] {
		grid-template-columns: minmax(0, 1fr);
	}
	.panes[data-show='render'] .render,
	.panes[data-show='spec'] .spec {
		grid-area: auto;
	}
	.panes[data-show='spec'] .spec {
		border: 0;
	}
	.panes[data-show='spec'] .json {
		height: var(--scrub-h);
	}

	/* column-reverse starts the scroll at the bottom: the caret is visible
	   without JavaScript and stays pinned as the text grows. */
	.json {
		display: flex;
		flex-direction: column-reverse;
		height: calc(var(--scrub-h) * 0.5);
		overflow: auto;
		outline: none;
	}
	.json:focus-visible {
		box-shadow: inset 0 0 0 2px var(--ring);
	}
	.json pre {
		margin: 0 0 auto;
		padding: 16px;
		font: 12.5px/1.6 var(--font-mono);
		color: var(--code-ink);
	}

	.render {
		height: var(--scrub-h);
		overflow: auto;
		padding: 20px;
		background: var(--background);
	}

	@container (min-width: 760px) {
		.panes {
			grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
		}
		.spec {
			grid-area: 1 / 1;
			border-top: 0;
			border-right: 1px solid var(--site-line);
		}
		.render {
			grid-area: 1 / 2;
		}
		/* Folded on a phone, then widened: the summary stays to reopen it. */
		.spec[open] summary {
			display: none;
		}
		.json {
			height: var(--scrub-h);
		}
	}

	/* The live caret: one of the two places the accent appears. */
	.json :global(.json-caret) {
		display: inline-block;
		width: 0.6ch;
		height: 1.15em;
		margin-left: 1px;
		vertical-align: text-bottom;
		background: var(--primary);
		animation: blink 1s steps(1) infinite;
	}
	.playing .json :global(.json-caret) {
		animation: none;
	}

	@keyframes blink {
		50% {
			opacity: 0;
		}
	}

	/* Narrow: the track takes the first row, buttons and readouts the second.
	   Wide: one row. */
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		padding: 12px 2px 0;
	}
	.track {
		order: -1;
		flex: 1 0 100%;
	}
	.speed {
		margin-left: auto;
	}

	@container (min-width: 760px) {
		.controls {
			flex-wrap: nowrap;
			gap: 12px;
		}
		.track {
			order: 0;
			flex: 1 1 auto;
		}
		.speed {
			margin-left: 0;
		}
	}

	.ctl {
		display: inline-grid;
		place-items: center;
		width: 36px;
		height: 36px;
		padding: 0;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-ink);
		cursor: pointer;
	}
	.ctl:hover {
		background: var(--site-hover);
	}
	.ctl:active {
		background: var(--site-pressed);
	}

	.track {
		position: relative;
		height: 36px;
		cursor: pointer;
		touch-action: none;
		user-select: none;
		border-radius: var(--radius-control);
		outline: none;
	}
	.track:focus-visible {
		box-shadow: 0 0 0 2px var(--ring);
	}
	.rail {
		position: absolute;
		inset: 17px 9px auto;
		height: 2px;
		background: var(--site-line);
		border-radius: 1px;
	}
	.fill {
		display: block;
		height: 100%;
		width: var(--pct);
		background: var(--site-soft);
		border-radius: inherit;
	}
	/* The scrub head: the other place the accent appears. */
	.head {
		position: absolute;
		top: 9px;
		left: calc(9px + (100% - 18px) * var(--pct) / 100%);
		width: 18px;
		height: 18px;
		margin-left: -9px;
		border-radius: 50%;
		background: var(--primary);
		box-shadow: 0 0 0 3px var(--card);
		transition: transform var(--dur-mount) var(--ease-out-quart);
	}
	.track:hover .head,
	.track.dragging .head {
		transform: scale(1.15);
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font: 12px/1 var(--font-mono);
		color: var(--site-soft);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.speed {
		display: inline-flex;
		padding: 2px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
	}
	.speed button {
		min-width: 36px;
		height: 30px;
		padding: 0 8px;
		border: 0;
		border-radius: calc(var(--radius-control) - 2px);
		background: transparent;
		color: var(--site-soft);
		font: 12px/1 var(--font-mono);
		cursor: pointer;
	}
	.speed button:hover {
		color: var(--site-ink);
	}
	.speed button[aria-pressed='true'] {
		background: var(--site-pressed);
		color: var(--site-ink);
	}

	figcaption {
		margin-top: 14px;
		font: 12px/1.4 var(--font-mono);
		color: var(--site-soft);
	}

	@media (prefers-reduced-motion: reduce) {
		.json :global(.json-caret) {
			animation: none;
		}
	}
</style>
