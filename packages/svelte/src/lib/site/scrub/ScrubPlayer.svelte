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
      with JavaScript off and stays pinned there as text arrives.
    - A fixture change resets the clock and remounts Ripple (fresh app state).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Ripple from '$lib/Ripple.svelte';
	import type { StreamSpecStore } from '$lib/streaming/types.js';
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
	}

	let { fixture, start = 0.5, autoplay = false, speed = 1, caption, class: className = '' }: Props = $props();

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
	const store: StreamSpecStore = $derived({ current: model.spec(count), done: atEnd, error: null, cancel() {} });
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
		else if (autoplay) playing = true;
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
		track?.focus();
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
	<div class="panes">
		<div class="json" role="region" aria-label="Spec received so far" tabindex="-1">
			<pre><JsonLines {text} highlight caret /></pre>
		</div>
		<div class="render" data-pagefind-ignore="all">
			{#key model}
				<Ripple streaming={store} skeleton="card" />
			{/key}
		</div>
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

	.panes {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		overflow: hidden;
		background: var(--card);
	}

	/* column-reverse starts the scroll at the bottom: the caret is visible
	   without JavaScript and stays pinned as the text grows. */
	.json {
		display: flex;
		flex-direction: column-reverse;
		height: calc(var(--scrub-h) * 0.5);
		overflow: auto;
		background: var(--code-bg);
		border-bottom: 1px solid var(--site-line);
		outline: none;
	}
	.json pre {
		margin: 0 0 auto;
		padding: 16px 18px;
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
		.json {
			height: var(--scrub-h);
			border-bottom: 0;
			border-right: 1px solid var(--site-line);
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
