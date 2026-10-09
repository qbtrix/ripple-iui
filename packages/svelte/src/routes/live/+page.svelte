<!--
  @file routes/live/+page.svelte
  @description /live: the nine recorded model streams (fixtures written offline
    by scripts/record-scenario.ts), each framed as a recording on the shared
    ScrubPlayer: the spec JSON so far beside the real <Ripple> render of it,
    over a scrub track. No model is called at runtime.
    - Prerendered with the first run's finished frame in the markup (start=1).
      onMount picks the run from `?run=<id>` (`?s=` still works: the landing
      links it), then remounts the player with autoplay from the first byte.
      Picking a run does the same and writes `?run=` with replaceState.
    - `onHostEvent` is the host's event handler, passed through the player to
      Ripple; its return value is the action result. The burger run's checkout
      `api` event goes to checkout.ts, which posts to the test store
      (PUBLIC_STORE_URL) and redirects; the store sends visitors back to
      `?order=<session>` or `?cancelled=1`, which OrderReceipt renders. The
      store return carries no run, so the burger must stay first in scenarios.
    - Layout: run list on the left from 1100px, a 3-column grid above the
      player from 768px, a horizontal strip under that. Under 768px the
      player shows Render / Spec / Prompt as tabs (`panes`, driven by a
      MediaQuery whose server value is false, so the markup holds both panes).
    - Local tokens (--line, --panel, --ink-soft) are read by OrderReceipt.
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { replaceState } from '$app/navigation';
	import type { RippleEvent } from '$lib/index.js';
	import ScrubPlayer from '$lib/site/scrub/ScrubPlayer.svelte';
	import { modelName } from '$lib/site/scrub/model-name.js';
	import { scenarios, type Scenario } from './scenarios.js';
	import { checkout, isCheckoutEvent, ORDER_SUMMARY_KEY, readReturn, type OrderSummary } from './checkout.js';
	import OrderReceipt from './OrderReceipt.svelte';

	const STORE_URL: string = import.meta.env.PUBLIC_STORE_URL;

	// Fixed locale and formats so the server and the browser print the same text.
	const chars = (s: Scenario) => s.fixture.chunks.reduce((n, c) => n + c.text.length, 0).toLocaleString('en-US');
	const secs = (s: Scenario) => `${((s.fixture.chunks.at(-1)?.t ?? 0) / 1000).toFixed(1)}s`;

	let active = $state<Scenario>(scenarios[0]);
	// The player remounts on `run`: a pick or the first mount restarts it with autoplay.
	let run = $state(0);
	let autoplay = $state(false);
	let tab = $state<'render' | 'spec' | 'prompt'>('render');
	let list = $state<HTMLUListElement>();
	const narrow = new MediaQuery('(max-width: 767px)', false);
	const panes = $derived(!narrow.current ? 'both' : tab === 'prompt' ? 'none' : tab);

	function pick(s: Scenario) {
		replaceState(`?run=${s.id}`, {});
		select(s);
	}

	function select(s: Scenario, play = true) {
		active = s;
		autoplay = play;
		events = [];
		toast = null;
		checkoutNote = null;
		run++;
	}

	// Host side of the generated UI. Every action the spec fires that Ripple
	// does not handle itself (toast, emit, navigate, api, ...) lands here.
	let checkoutNote = $state<{ busy: boolean; text: string } | null>(null);
	let receipt = $state<{ order: string | null; mock: boolean; cancelled: boolean; summary: OrderSummary | null } | null>(null);
	let events = $state<{ id: number; text: string }[]>([]);
	let toast = $state<{ id: number; message: string } | null>(null);
	let eventId = 0;
	function onHostEvent(event: RippleEvent) {
		const e = event as RippleEvent & { action?: string; message?: unknown; target?: string };
		const kind = e.action ?? e.type;
		if (kind === 'toast') {
			const t = { id: ++eventId, message: String(e.message ?? '') };
			toast = t;
			setTimeout(() => toast?.id === t.id && (toast = null), 2600);
		}
		const detail = kind === 'toast' ? String(e.message ?? '') : (e.target ?? event.url ?? '');
		events = [{ id: ++eventId, text: detail ? `${kind}: ${detail}` : kind }, ...events].slice(0, 4);
		console.info('[live] host event', { type: kind, url: event.url }); // never the body: it carries customer details
		if (isCheckoutEvent(event)) return placeOrder(event.body);
		return undefined;
	}

	async function placeOrder(body: unknown) {
		// One checkout at a time: a double click would open two store sessions.
		if (checkoutNote?.busy) return { ok: false, error: { message: 'Checkout is already opening.' } };
		checkoutNote = { busy: true, text: 'Opening the store checkout...' };
		const result = await checkout(body, {
			storeUrl: STORE_URL,
			pageOrigin: location.origin,
			navigate: (url) => location.assign(url),
			remember: (summary) => {
				try {
					sessionStorage.setItem(ORDER_SUMMARY_KEY, JSON.stringify(summary));
				} catch {
					/* private mode: the receipt just skips the item list */
				}
			}
		});
		checkoutNote = result.ok ? { busy: true, text: 'Redirecting to checkout...' } : { busy: false, text: result.error?.message ?? 'Checkout failed.' };
		return result;
	}

	function dismissReceipt() {
		receipt = null;
		try {
			sessionStorage.removeItem(ORDER_SUMMARY_KEY);
		} catch {
			/* ignore */
		}
		replaceState(`?run=${active.id}`, {});
	}

	onMount(() => {
		const q = new URLSearchParams(location.search);
		const wanted = q.get('run') ?? q.get('s');
		const back = readReturn(location.search);
		if (back) {
			let summary: OrderSummary | null = null;
			try {
				const saved = JSON.parse(sessionStorage.getItem(ORDER_SUMMARY_KEY) ?? 'null');
				if (Array.isArray(saved?.lines)) summary = saved;
			} catch {
				/* no saved cart */
			}
			receipt = { ...back, summary };
		}
		// Back from the store: keep the finished order form, don't replay over it.
		select(scenarios.find((x) => x.id === wanted) ?? scenarios[0], !back);
		// A deep link to a later run: bring its row into the phone strip.
		// Phones only: on a wide page it would scroll the page itself.
		if (narrow.current) tick().then(() => list?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
	});
</script>

<!-- Back from the store's checkout via bfcache: drop the stale "Redirecting..." note. -->
<svelte:window onpageshow={(e) => e.persisted && (checkoutNote = null)} />

<svelte:head>
	<title>Live: watch a model build a UI with Ripple</title>
	<meta
		name="description"
		content="Recordings of real model output streaming into Ripple. Scrub to any point and see the interface the spec had built by then; at the end it works: change the inputs and the numbers follow."
	/>
</svelte:head>

<main class="live">
	<header class="head">
		<h1>Watch a model build the tool it was asked for.</h1>
		<p class="lede">
			Each run is a real recording of a model's output, played on its original timing. Drag the track to
			any point and Ripple renders the spec as it stood then. At the end the tool is live: change the
			inputs and the numbers follow.
		</p>
	</header>

	{#if receipt}
		<OrderReceipt storeUrl={STORE_URL} {...receipt} ondismiss={dismissReceipt} />
	{/if}

	<div class="layout">
		<ul class="runs" aria-label="Recorded runs" bind:this={list}>
			{#each scenarios as s (s.id)}
				<li>
					<button type="button" class="run" aria-pressed={s.id === active.id} onclick={() => pick(s)}>
						<span class="run-line"><span class="run-title">{s.title}</span><span class="run-len">{secs(s)}</span></span>
						<span class="run-line run-sub"><span>{s.category}</span><span class="run-size">{chars(s)} chars</span></span>
					</button>
				</li>
			{/each}
		</ul>

		<section class="stage" aria-label="Recording: {active.title}" data-tab={tab}>
			<div class="tabs" role="group" aria-label="View">
				{#each [['render', 'Render'], ['spec', 'Spec'], ['prompt', 'Prompt']] as const as [id, label] (id)}
					<button type="button" aria-pressed={tab === id} onclick={() => (tab = id)}>{label}</button>
				{/each}
			</div>

			{#key run}
				<ScrubPlayer fixture={active.fixture} start={1} {autoplay} autoplayFrom={0} holdSkeleton {panes} onEvent={onHostEvent} />
			{/key}

			{#if toast || (checkoutNote && active.needsStore) || events.length}
				<div class="host">
					{#if toast}<p class="note" role="status">{toast.message}</p>{/if}
					{#if checkoutNote && active.needsStore}
						<p class="note" role={checkoutNote.busy ? 'status' : 'alert'} data-busy={checkoutNote.busy}>{checkoutNote.text}</p>
					{/if}
					{#if events.length}
						<ol class="events" aria-label="Host events">
							{#each events as ev (ev.id)}<li>{ev.text}</li>{/each}
						</ol>
					{/if}
				</div>
			{/if}

			<div class="about">
				<p class="prompt"><span class="who">Prompt</span>{active.fixture.prompt}</p>
				<p class="facts">
					recorded from {modelName(active.fixture.model)} on {active.fixture.recordedAt.slice(0, 10)}, {chars(active)} chars, {secs(active)}
				</p>
			</div>
		</section>
	</div>
</main>

<style>
	/* Paw OS tokens from site.css. Local names are prefixed or generic on
	   purpose: --accent and --radius belong to the widgets in the render, and
	   OrderReceipt reads --line, --panel and --ink-soft. */
	.live {
		--live-accent: var(--primary);
		--live-accent-ink: var(--primary-ink);
		--panel: var(--card);
		--ink-soft: var(--site-soft);
		--line: var(--site-line);
		font-family: var(--font-sans);
		background: var(--site-ground);
		color: var(--site-ink);
		padding: 0 var(--site-gutter) 72px;
		overflow-x: clip;
	}
	.live > * {
		max-width: var(--site-max);
		margin-inline: auto;
	}

	.head {
		padding: clamp(32px, 6vw, 64px) 0 28px;
	}
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2.2rem, 4.2vw, 3.4rem);
		line-height: 1.04;
		letter-spacing: -0.03em;
		font-weight: 650;
		text-wrap: balance;
	}
	.lede {
		margin: 16px 0 0;
		max-width: 62ch;
		line-height: 1.6;
		color: var(--ink-soft);
	}

	/* Run list: one framed list of quiet rows, not a wall of cards. Wide: a
	   column beside the player. Mid: a 3-column grid above it. Phone: a strip
	   of bordered rows that scrolls sideways inside itself.
	   Selected = accent border and accent title; no fill. */
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
	}
	.runs {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 2px;
		padding: 4px;
		border: 1px solid var(--line);
		border-radius: var(--radius-card);
		background: var(--panel);
	}
	@media (min-width: 1100px) {
		.layout {
			grid-template-columns: 272px minmax(0, 1fr);
			gap: 24px;
			align-items: start;
		}
		.runs {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	.run {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 4px;
		text-align: left;
		font: inherit;
		color: inherit;
		padding: 10px 12px;
		border: 1px solid transparent;
		border-radius: var(--radius-control);
		background: transparent;
		cursor: pointer;
		transition: background-color 0.15s;
	}
	.run:hover {
		background: var(--site-hover);
	}
	.run[aria-pressed='true'] {
		border-color: var(--live-accent);
		box-shadow: inset 0 0 0 1px var(--live-accent);
	}
	.run[aria-pressed='true'] .run-title {
		color: var(--live-accent-ink);
	}
	.run:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.run-line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		min-width: 0;
	}
	.run-title {
		font-weight: 600;
		font-size: 15px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.run-len,
	.run-size {
		flex: none;
		font: 12px/1 var(--font-mono);
		font-variant-numeric: tabular-nums;
		color: var(--ink-soft);
	}
	.run-sub {
		font-size: 13px;
		color: var(--ink-soft);
	}

	.stage {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}
	.tabs {
		display: none;
	}

	.host {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.note {
		margin: 0;
		max-width: 560px;
		padding: 10px 14px;
		border: 1px solid var(--line);
		border-radius: var(--radius-control);
		font-size: 14px;
		line-height: 1.45;
	}
	.note[data-busy='false'] {
		border-color: color-mix(in oklch, var(--destructive, oklch(0.58 0.22 27)) 45%, transparent);
	}
	.events {
		list-style: none;
		margin: 0;
		padding: 0;
		font: 12px/1.6 var(--font-mono);
		color: var(--ink-soft);
	}

	.about {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-top: 16px;
		border-top: 1px solid var(--line);
	}
	.prompt {
		margin: 0;
		max-width: 68ch;
		font-size: 15px;
		line-height: 1.55;
	}
	.who {
		display: block;
		font-size: 13px;
		font-weight: 600;
		color: var(--ink-soft);
		margin-bottom: 4px;
	}
	.facts {
		margin: 0;
		font: 12px/1.5 var(--font-mono);
		color: var(--ink-soft);
	}

	@media (max-width: 767px) {
		.head {
			padding: 16px 0 16px;
		}
		h1 {
			font-size: 1.75rem;
		}
		.lede {
			margin-top: 10px;
			font-size: 15px;
			line-height: 1.5;
		}
		.layout {
			gap: 12px;
		}
		/* The strip: fixed-width rows that scroll inside the list, not the page. */
		.runs {
			display: flex;
			gap: 8px;
			border: 0;
			border-radius: 0;
			background: none;
			overflow-x: auto;
			scroll-snap-type: x proximity;
			scrollbar-width: none;
			margin-inline: calc(-1 * var(--site-gutter));
			padding: 2px var(--site-gutter);
			scroll-padding-inline: var(--site-gutter);
		}
		.runs li {
			flex: none;
			scroll-snap-align: start;
		}
		.run {
			border-color: var(--line);
			background: var(--panel);
		}
		.run-sub {
			display: none;
		}
		.run-title {
			overflow: visible;
		}
		.stage {
			gap: 12px;
		}
		.tabs {
			display: flex;
			border: 1px solid var(--line);
			border-radius: var(--radius-control);
			overflow: hidden;
		}
		.tabs button {
			flex: 1;
			min-height: 44px;
			border: 0;
			background: transparent;
			color: var(--ink-soft);
			font: inherit;
			font-size: 14px;
			font-weight: 500;
			cursor: pointer;
		}
		.tabs button + button {
			border-left: 1px solid var(--line);
		}
		.tabs button[aria-pressed='true'] {
			background: var(--site-pressed);
			color: var(--site-ink);
			font-weight: 600;
		}
		.tabs button:focus-visible {
			outline: 2px solid var(--ring);
			outline-offset: -2px;
		}
		/* Prompt tab: the player's panes hide, the prompt takes their place
		   above the track. Other tabs: the prompt is not shown. */
		.about {
			display: none;
		}
		.stage[data-tab='prompt'] .about {
			display: flex;
			order: 1;
			padding: 16px;
			border: 1px solid var(--line);
			border-radius: var(--radius-card);
			background: var(--panel);
		}
		.stage > :global(*) {
			order: 2;
		}
		.stage > .tabs {
			order: 0;
		}
	}
</style>
