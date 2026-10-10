<!--
  @file routes/live/+page.svelte
  @description /live, the runs gallery: every recorded model answer (real
    output, recorded offline by scripts/record-scenario.ts) and every
    hand-written answer (play-cards.ts) as a thumbnail card with its prompt as
    the caption, tagged Recorded or Hand-written. A plain click on a card opens
    the run in place (Player: it streams into <Ripple> and ends as a working
    card) with a "Back to gallery" button; the card's href `?s=<id>` is the
    deep link, read after mount since the page is prerendered, and browser
    Back returns to the grid (shallow pushState). No model is called at
    runtime. A return from the store's checkout (`?order=` or `?cancelled=1`,
    checkout.readReturn) shows OrderReceipt above and opens the order run.

  Look: the site's tokens and fonts under the shared top bar and footer from
    +layout.svelte. The local --line, --panel and --ink-soft are read by
    OrderReceipt.
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { pushState, replaceState } from '$app/navigation';
	import GalleryGrid from '../showcase/GalleryGrid.svelte';
	import { liveItems, liveRuns } from '../showcase/gallery.js';
	import { readReturn } from './checkout.js';
	import OrderReceipt from './OrderReceipt.svelte';
	import Player from './Player.svelte';

	const STORE_URL: string = import.meta.env.PUBLIC_STORE_URL;

	let openId = $state<string | null>(null);
	let receipt = $state<{ order: string | null; mock: boolean; cancelled: boolean } | null>(null);
	let back = $state<HTMLButtonElement>();
	const open = $derived(liveRuns.find((s) => s.id === openId) ?? null);
	const openItem = $derived(liveItems.find((i) => i.id === `live-${openId}`));

	const runId = (search: string) => {
		const id = new URLSearchParams(search).get('s');
		return id && liveRuns.some((s) => s.id === id) ? id : null;
	};

	async function show(id: string | null) {
		openId = id;
		if (id) {
			window.scrollTo({ top: 0 });
			await tick();
			back?.focus({ preventScroll: true });
		}
	}

	/** True while the open run came from a card click, so Back can pop that entry. */
	let pushed = false;

	function openRun(item: { id: string; href: string }) {
		pushState(item.href, {});
		pushed = true;
		show(item.id.replace(/^live-/, ''));
	}

	/** Back to the grid, with focus on the card that was open. */
	function toGrid() {
		const id = openId;
		openId = null;
		pushed = false;
		tick().then(() => document.getElementById(`g-live-${id}`)?.closest('a')?.focus());
	}

	function closeRun() {
		if (pushed) return history.back();
		replaceState('/live', {});
		toGrid();
	}

	function onPop() {
		const id = runId(location.search);
		if (id) show(id);
		else if (openId) toGrid();
	}

	function dismissReceipt() {
		receipt = null;
		replaceState(openId ? `?s=${openId}` : '/live', {});
	}

	onMount(() => {
		receipt = readReturn(location.search);
		show(runId(location.search) ?? (receipt ? 'order-burger' : null));
	});
</script>

<svelte:window onpopstate={onPop} />

<svelte:head>
	<title>Live: watch a model build a UI with Ripple</title>
	<meta
		name="description"
		content="Replays of model output streaming into Ripple. The interface builds itself as the JSON arrives, then works: change the inputs and the numbers follow."
	/>
</svelte:head>

<main class="live">
	{#if receipt}
		<OrderReceipt storeUrl={STORE_URL} {...receipt} ondismiss={dismissReceipt} />
	{/if}

	{#if open}
		<div class="run-head">
			<button type="button" class="back" bind:this={back} onclick={closeRun}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"
					><path d="M15 18l-6-6 6-6" /></svg
				>
				Back to gallery
			</button>
			<h1>{open.title}</h1>
			{#if openItem}<span class="tag">{openItem.tag}</span>{/if}
		</div>
		{#key open.id}<Player run={open} storeUrl={STORE_URL} />{/key}
	{:else}
		<header class="head">
			<h1>Live</h1>
			<p class="lede">
				Watch a model build what it was asked for, then use it. Recorded runs are real model output on their original
				timing. Hand-written runs are cards we wrote for the newer widgets.
			</p>
		</header>
		<GalleryGrid items={liveItems} label="Runs" onopen={openRun} />
	{/if}
</main>

<style>
	.live {
		--panel: var(--card);
		--ink-soft: var(--site-soft);
		--line: var(--site-line);
		box-sizing: border-box;
		width: 100%;
		max-width: var(--site-max);
		margin: 0 auto;
		padding: 0 var(--site-gutter) 72px;
		font-family: var(--font-sans);
		color: var(--site-ink);
		overflow-x: clip;
	}
	.head {
		padding: clamp(28px, 5vw, 48px) 0 20px;
	}
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2rem, 4vw, 2.75rem);
		font-weight: 650;
		line-height: 1.05;
		letter-spacing: -0.03em;
	}
	.lede {
		margin: 12px 0 0;
		max-width: 64ch;
		font-size: 16px;
		line-height: 1.55;
		color: var(--site-soft);
	}
	.run-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 14px;
		padding: 20px 0 16px;
	}
	.run-head h1 {
		font-size: clamp(1.5rem, 3vw, 2rem);
	}
	.tag {
		padding: 2px 8px;
		border: 1px solid var(--site-line);
		border-radius: 999px;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--site-soft);
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		padding: 0 14px 0 10px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-ink);
		font: inherit;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s;
	}
	.back:hover {
		background: var(--site-hover);
	}
	.back:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	@media (max-width: 639px) {
		.live {
			padding-inline: 16px;
		}
		.run-head {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
