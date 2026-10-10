<!--
  @file routes/live/+page.svelte
  @description /live: replays a REAL recorded model stream (fixtures written
    offline by scripts/record-scenario.ts) through streamSpec into <Ripple>,
    so the UI builds itself as the JSON arrives and ends as a working tool.
    Prerendered: the resting state (first scenario's full JSON + finished UI)
    is in the markup; onMount replays on top of it. `?s=<id>` preselects.
    No model is called at runtime. `onHostEvent` is the host's event handler:
    the order demo's checkout `api` event goes to checkout.ts, which posts to
    the test store (PUBLIC_STORE_URL, build-time host config); the payment link
    it returns shows as the same PayCard the landing chat uses (new-tab link,
    polling, then tracking), so the page never navigates away. A link back to
    `?order=<session>` or `?cancelled=1` still renders OrderReceipt.

  Look: the site's Paw OS skin (site.css tokens and fonts) under the shared
    top bar and footer from +layout.svelte; this page adds no chrome of its own.
    Its local tokens are prefixed (--live-accent, --live-radius) so the widgets
    in the render frame keep their own --accent and --radius. The picker is a
    3x3 grid from 1024px and compact one-line rows under 768px, so on a phone
    the player starts in the first screen and a half; the selected run is an
    accent border and accent title, not a fill. The model output pane is
    pretty-printed as it streams (JsonLines). Speed and Replay are one 8px
    segmented control.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { Ripple, type RippleEvent } from '$lib/index.js';
	import { streamSpec, type StreamSpecStore } from '$lib/streaming/index.js';
	import { replay } from './replay.js';
	import { scenarios, type Scenario } from './scenarios.js';
	import { checkout, isCheckoutEvent, readReturn, type Pay } from './checkout.js';
	import OrderReceipt from './OrderReceipt.svelte';
	import PayCard from '../pawbar/PayCard.svelte';
	import type { Phase } from '../pay/watch.svelte.js';
	import JsonLines from '$lib/site/JsonLines.svelte';

	const STORE_URL: string = import.meta.env.PUBLIC_STORE_URL;

	const fullText = (s: Scenario) => s.fixture.chunks.map((c) => c.text).join('');

	let active = $state<Scenario>(scenarios[0]);
	let speed = $state(1);
	let typed = $state(fullText(scenarios[0]));
	let store = $state<StreamSpecStore | null>(null);
	let run = $state(0);
	let jsonOpen = $state(true);
	let pre = $state<HTMLPreElement>();
	let controller: AbortController | null = null;

	const total = $derived(fullText(active).length);
	const restingSpec = $derived(JSON.parse(fullText(active)));
	const streaming = $derived(store != null && !store.done);

	async function* tap(source: AsyncIterable<string>) {
		for await (const text of source) {
			typed += text;
			yield text;
		}
	}

	function play(s: Scenario = active) {
		controller?.abort();
		controller = new AbortController();
		active = s;
		typed = '';
		events = [];
		checkoutNote = null;
		run++;
		store = streamSpec(tap(replay(s.fixture, { speed, signal: controller.signal })), {
			signal: controller.signal,
			throttleMs: 40
		});
	}

	function pick(s: Scenario) {
		replaceState(`?s=${s.id}`, {});
		play(s);
	}

	function setSpeed(n: number) {
		speed = n;
		if (streaming) play();
	}

	// Host side of the generated UI. Every action the spec fires that Ripple
	// does not handle itself (toast, emit, navigate, api, ...) lands here.
	// The order demo's Checkout `api` event goes to the store via checkout.ts.
	let checkoutNote = $state<{ busy: boolean; text: string } | null>(null);
	let receipt = $state<{ order: string | null; mock: boolean; cancelled: boolean } | null>(null);
	let pay = $state.raw<Pay | null>(null);
	let payPhase = $state<Phase | null>(null);
	let lastOrder: unknown = null;
	let events = $state<{ id: number; text: string }[]>([]);
	let toast = $state<{ id: number; message: string; variant: string } | null>(null);
	let eventId = 0;
	function onHostEvent(event: RippleEvent) {
		const e = event as RippleEvent & { action?: string; message?: unknown; variant?: string; target?: string };
		const kind = e.action ?? e.type;
		if (kind === 'toast') {
			const t = { id: ++eventId, message: String(e.message ?? ''), variant: e.variant ?? 'info' };
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
		// An open order keeps its session: only a cancelled one may start another.
		if (pay && payPhase !== 'cancelled') return { ok: false, error: { message: 'This order is already open below.' } };
		checkoutNote = { busy: true, text: 'Opening the store checkout...' };
		const result = await checkout(body, { storeUrl: STORE_URL, pageOrigin: location.origin });
		if (result.ok) {
			pay = result.data;
			lastOrder = body;
			checkoutNote = null;
		} else checkoutNote = { busy: false, text: result.error.message };
		return result;
	}

	function dismissReceipt() {
		receipt = null;
		replaceState(`?s=${active.id}`, {});
	}

	// Follow the stream while it is arriving.
	$effect(() => {
		void typed;
		if (streaming && pre) pre.scrollTop = pre.scrollHeight;
	});

	onMount(() => {
		const wanted = new URLSearchParams(location.search).get('s');
		receipt = readReturn(location.search);
		const s = scenarios.find((x) => x.id === wanted) ?? scenarios[0];
		if (window.matchMedia('(max-width: 720px)').matches) jsonOpen = false;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			active = s;
			typed = fullText(s);
		} else play(s);
		return () => controller?.abort();
	});
</script>

<!-- Back from the store's checkout via bfcache: drop the stale "Redirecting..." note. -->
<svelte:head>
	<title>Live: watch a model build a UI with Ripple</title>
	<meta
		name="description"
		content="Replays of real model output streaming into Ripple. The interface builds itself as the JSON arrives, then works: change the inputs and the numbers follow."
	/>
</svelte:head>

<main class="live">
	<header class="head">
		<h1>Watch a model build the tool it was asked for.</h1>
		<p class="lede">
			Each run below is a real recording of a model's output, replayed on its original timing. Ripple
			renders the spec while it streams, and the finished UI is live: change the inputs and the numbers
			follow.
		</p>
	</header>

	{#if receipt}
		<OrderReceipt storeUrl={STORE_URL} {...receipt} ondismiss={dismissReceipt} />
	{/if}

	<ul class="picker" aria-label="Scenarios">
		{#each scenarios as s (s.id)}
			<li>
				<button
					type="button"
					class="scenario"
					aria-pressed={s.id === active.id}
					onclick={() => pick(s)}
				>
					<span class="scenario-line"><span class="scenario-title">{s.title}</span><span class="scenario-cat">{s.category}</span></span>
					<span class="scenario-prompt">{s.fixture.prompt}</span>
				</button>
			</li>
		{/each}
	</ul>

	<section class="stage" aria-label="Replay">
		<div class="bar">
			<p class="bubble"><span class="who">Prompt</span>{active.fixture.prompt}</p>
			<div class="controls">
				<span class="status" aria-live="polite">
					{streaming ? `streaming ${typed.length} / ${total} bytes` : 'done, try it'}
				</span>
				<div class="segmented" role="group" aria-label="Replay controls">
					{#each [1, 2] as n (n)}
						<button type="button" aria-pressed={speed === n} aria-label="{n}x speed" onclick={() => setSpeed(n)}>{n}x</button>
					{/each}
					<button type="button" onclick={() => play()}>Replay</button>
				</div>
			</div>
		</div>

		<div class="panes">
			<div class="render">
				<span class="label">ripple render</span>
				<div class="frame">
					{#key run}
						{#if store}
							<Ripple streaming={store} skeleton="card" onEvent={onHostEvent} />
						{:else}
							<Ripple spec={restingSpec} onEvent={onHostEvent} />
						{/if}
					{/key}
					{#if toast}
						<div class="toast" data-variant={toast.variant} role="status">{toast.message}</div>
					{/if}
				</div>
				{#if pay && active.needsStore}
					{#key pay.sessionId}<PayCard {pay} storeUrl={STORE_URL} onretry={() => placeOrder(lastOrder)} onphase={(p) => (payPhase = p)} />{/key}
				{/if}
				{#if checkoutNote && active.needsStore}
					<p class="checkout-note" role={checkoutNote.busy ? 'status' : 'alert'} data-busy={checkoutNote.busy}>
						{checkoutNote.text}
					</p>
				{/if}
				{#if events.length}
					<ol class="events" aria-label="Host events">
						{#each events as ev (ev.id)}<li>{ev.text}</li>{/each}
					</ol>
				{/if}
			</div>

			<details class="json" bind:open={jsonOpen}>
				<summary class="label">model output <span>{active.fixture.model}, {total} bytes</span></summary>
				<pre bind:this={pre}><JsonLines text={typed} /></pre>
			</details>
		</div>
	</section>

</main>

<style>
	/* Paw OS tokens from site.css, so /live reads as the same site. Local names
	   are prefixed: --accent and --radius belong to the widgets in the frame.
	   (--line, --panel, --ink-soft are read by OrderReceipt.) */
	.live {
		--live-accent: var(--primary);
		--live-accent-ink: var(--primary-ink);
		--ground: var(--site-ground);
		--panel: var(--card);
		--ink-soft: var(--site-soft);
		--line: var(--site-line);
		--mono: var(--font-mono);
		--live-radius: var(--radius-card);
		font-family: var(--font-sans);
		background: var(--ground);
		color: var(--site-ink);
		padding: 0 var(--site-gutter) 72px;
		overflow-x: clip;
	}
	.live > * {
		max-width: var(--site-max);
		margin-inline: auto;
	}
	pre {
		font-family: var(--mono);
	}

	.head {
		padding: clamp(40px, 7vw, 72px) 0 32px;
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

	/* Picker: 3x3 from 1024px, two columns between, one-line rows on phones.
	   Selected = accent border and accent title; no fill. */
	.picker {
		list-style: none;
		margin: 0 auto 24px;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}
	@media (min-width: 1024px) {
		.picker {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	.scenario {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 4px;
		text-align: left;
		font: inherit;
		color: inherit;
		padding: 14px 16px;
		border: 1px solid var(--line);
		border-radius: var(--live-radius);
		background: var(--panel);
		cursor: pointer;
		transition: border-color 0.15s;
	}
	.scenario:hover {
		border-color: color-mix(in oklch, var(--site-ink) 30%, transparent);
	}
	.scenario[aria-pressed='true'] {
		border-color: var(--live-accent);
		box-shadow: inset 0 0 0 1px var(--live-accent);
	}
	.scenario[aria-pressed='true'] .scenario-title {
		color: var(--live-accent-ink);
	}
	.scenario:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.scenario-line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
	}
	.scenario-title {
		font-weight: 600;
	}
	.scenario-cat {
		flex: none;
		font-size: 13px;
		color: var(--ink-soft);
	}
	.scenario-prompt {
		font-size: 14px;
		line-height: 1.45;
		color: var(--ink-soft);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.stage {
		border: 1px solid var(--line);
		border-radius: var(--live-radius);
		background: var(--panel);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 20px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--line);
	}
	.bubble {
		margin: 0;
		max-width: 60ch;
		padding: 10px 14px;
		border-radius: var(--live-radius);
		background: var(--site-hover);
		line-height: 1.5;
		font-size: 15px;
	}
	.who {
		display: block;
		font-size: 13px;
		font-weight: 600;
		color: var(--ink-soft);
		margin-bottom: 2px;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-left: auto;
	}
	.status {
		font-size: 13px;
		color: var(--ink-soft);
		font-variant-numeric: tabular-nums;
	}
	/* One 8px segmented control: the speeds, then Replay. */
	.segmented {
		display: inline-flex;
		border: 1px solid var(--line);
		border-radius: var(--radius-control);
		overflow: hidden;
	}
	.segmented button {
		min-height: 44px;
		min-width: 44px;
		padding: 0 14px;
		border: 0;
		background: transparent;
		color: var(--site-ink);
		font: inherit;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s;
	}
	.segmented button + button {
		border-left: 1px solid var(--line);
	}
	.segmented button:hover {
		background: var(--site-hover);
	}
	.segmented button[aria-pressed='true'] {
		background: var(--site-pressed);
		font-weight: 600;
	}
	.segmented button:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: -2px;
	}

	.panes {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
		grid-template-areas: 'json render';
		height: 640px;
	}
	.label {
		font-size: 13px;
		font-weight: 600;
		color: var(--ink-soft);
	}
	.render {
		grid-area: render;
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		min-width: 0;
		overflow: auto;
	}
	.frame {
		position: relative;
		max-width: 560px;
	}
	.toast {
		position: sticky;
		bottom: 8px;
		margin-top: 12px;
		padding: 10px 14px;
		border-radius: var(--radius-control);
		background: var(--site-ink);
		color: var(--site-ground);
		font-size: 14px;
	}
	.checkout-note {
		margin: 0;
		max-width: 560px;
		padding: 10px 14px;
		border: 1px solid var(--line);
		border-radius: var(--radius-control);
		font-size: 14px;
		line-height: 1.45;
	}
	.checkout-note[data-busy='false'] {
		border-color: color-mix(in oklch, var(--destructive, oklch(0.58 0.22 27)) 45%, transparent);
	}
	.events {
		list-style: none;
		margin: 0;
		padding: 0;
		font-family: var(--mono);
		font-size: 12px;
		color: var(--ink-soft);
	}
	.json {
		grid-area: json;
		display: flex;
		flex-direction: column;
		min-height: 0;
		background: var(--code-bg);
		border-right: 1px solid var(--line);
	}
	.json summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-height: 44px;
		padding: 0 16px;
		cursor: pointer;
		list-style: none;
	}
	.json summary span {
		font-weight: 400;
		color: var(--ink-soft);
	}
	.json summary:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: -2px;
	}
	.json[open] {
		overflow: hidden;
	}
	.json pre {
		margin: 0;
		padding: 4px 16px 16px;
		height: calc(640px - 48px);
		overflow: auto;
		font-size: 12.5px;
		line-height: 1.55;
		color: var(--code-ink);
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
		/* Compact rows: title and category on one line, no prompt. */
		.picker {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
			margin-bottom: 16px;
			border-top: 1px solid var(--line);
		}
		.scenario {
			min-height: 44px;
			justify-content: center;
			padding: 0 12px;
			border: 0;
			border-bottom: 1px solid var(--line);
			border-radius: 0;
			background: transparent;
		}
		.scenario[aria-pressed='true'] {
			border-radius: var(--radius-control);
			box-shadow: inset 0 0 0 1px var(--live-accent);
		}
		.scenario[aria-pressed='true'] .scenario-cat {
			color: var(--live-accent-ink);
		}
		.scenario-prompt {
			display: none;
		}
		.panes {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas: 'render' 'json';
			height: auto;
		}
		.render {
			overflow: visible;
		}
		.json {
			border-right: 0;
			border-top: 1px solid var(--line);
		}
		.json pre {
			height: 260px;
		}
		.controls {
			flex-wrap: wrap;
			margin-left: 0;
			width: 100%;
		}
		.status {
			flex-basis: 100%;
		}
	}
</style>
