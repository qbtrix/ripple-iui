<!--
  @file routes/live/+page.svelte
  @description /live: replays a REAL recorded model stream (fixtures written
    offline by scripts/record-scenario.ts) through streamSpec into <Ripple>,
    so the UI builds itself as the JSON arrives and ends as a working tool.
    Prerendered: the resting state (first scenario's full JSON + finished UI)
    is in the markup; onMount replays on top of it. `?s=<id>` preselects.
    No model is called at runtime. `onHostEvent` is the host's event handler:
    the order demo's checkout `api` event goes to checkout.ts, which posts to
    the test store (PUBLIC_STORE_URL, build-time host config) and redirects to
    its checkout; the store sends visitors back to `?order=<session>` or
    `?cancelled=1`, which OrderReceipt renders.

  Creative Direction Declaration
    Archetype: Technology. Richness: Premium minimal.
    Design read: the landing's Clean-Tech system (shadcn tokens, one cool blue
      accent, system UI and mono stacks), carried onto a viewer page.
    Trap avoided: a chat-app clone. The prompt is one bubble; the stage is the
      raw stream beside the UI it becomes.
    Dials: variance 5, motion 4, density 4.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { Ripple, type RippleEvent } from '$lib/index.js';
	import { streamSpec, type StreamSpecStore } from '$lib/streaming/index.js';
	import { replay } from './replay.js';
	import { scenarios, type Scenario } from './scenarios.js';
	import { checkout, isCheckoutEvent, ORDER_SUMMARY_KEY, readReturn, type OrderSummary } from './checkout.js';
	import OrderReceipt from './OrderReceipt.svelte';

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
	let receipt = $state<{ order: string | null; mock: boolean; cancelled: boolean; summary: OrderSummary | null } | null>(null);
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
		replaceState(`?s=${active.id}`, {});
	}

	// Follow the stream while it is arriving.
	$effect(() => {
		void typed;
		if (streaming && pre) pre.scrollTop = pre.scrollHeight;
	});

	onMount(() => {
		const wanted = new URLSearchParams(location.search).get('s');
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
<svelte:window onpageshow={(e) => e.persisted && (checkoutNote = null)} />

<svelte:head>
	<title>Live: watch a model build a UI with Ripple</title>
	<meta
		name="description"
		content="Replays of real model output streaming into Ripple. The interface builds itself as the JSON arrives, then works: change the inputs and the numbers follow."
	/>
</svelte:head>

<main class="live">
	<header class="head">
		<h1>Watch a model build the tool <span>it was asked for.</span></h1>
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
					<span class="scenario-cat">{s.category}</span>
					<span class="scenario-title">{s.title}</span>
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
				<div class="speed" role="group" aria-label="Replay speed">
					{#each [1, 2] as n (n)}
						<button type="button" aria-pressed={speed === n} onclick={() => setSpeed(n)}>{n}x</button>
					{/each}
				</div>
				<button type="button" class="replay" onclick={() => play()}>Replay</button>
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
				<pre bind:this={pre}><code>{typed}</code></pre>
			</details>
		</div>
	</section>

	<footer class="foot">
		<a href="/">Ripple home</a>
		<a href="https://github.com/qbtrix/ripple-iui">github.com/qbtrix/ripple-iui</a>
	</footer>
</main>

<style>
	/* Tokens mirror routes/+page.svelte so /live reads as the same site. */
	.live {
		--accent: hsl(216 74% 50%);
		--accent-ink: hsl(0 0% 100%);
		--ground: hsl(220 20% 98.4%);
		--panel: var(--card);
		--ink-soft: color-mix(in srgb, var(--foreground) 62%, var(--ground));
		--line: var(--border);
		--mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		--radius: 12px;
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		background: var(--ground);
		color: var(--foreground);
		padding: 0 24px;
		overflow-x: clip;
	}
	:global(.dark) .live {
		--accent: hsl(214 80% 62%);
		--accent-ink: hsl(222 30% 8%);
		--ground: hsl(222 14% 6%);
		--panel: hsl(222 12% 9%);
	}
	.live > * {
		max-width: 1160px;
		margin-inline: auto;
	}
	code,
	pre {
		font-family: var(--mono);
	}

	.head {
		padding: 64px 0 32px;
	}
	h1 {
		margin: 0;
		font-size: clamp(2rem, 3.6vw, 3.1rem);
		line-height: 1.06;
		letter-spacing: -0.03em;
		font-weight: 600;
	}
	h1 span {
		color: var(--ink-soft);
	}
	.lede {
		margin: 16px 0 0;
		max-width: 62ch;
		line-height: 1.6;
		color: var(--ink-soft);
	}

	.picker {
		list-style: none;
		margin: 0 0 20px;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 12px;
	}
	.scenario {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 4px;
		text-align: left;
		font: inherit;
		color: inherit;
		padding: 14px 16px;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--panel);
		cursor: pointer;
		transition: border-color 0.15s;
	}
	.scenario:hover {
		border-color: color-mix(in srgb, var(--foreground) 35%, transparent);
	}
	.scenario[aria-pressed='true'] {
		border-color: var(--accent);
	}
	.scenario-cat {
		font-family: var(--mono);
		font-size: 11px;
		color: var(--ink-soft);
	}
	.scenario-title {
		font-weight: 600;
	}
	.scenario-prompt {
		font-size: 13px;
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
		border-radius: 16px;
		background: var(--panel);
		box-shadow: 0 30px 60px -36px color-mix(in srgb, var(--foreground) 28%, transparent);
		overflow: hidden;
	}
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 20px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--line);
	}
	.bubble {
		margin: 0;
		max-width: 60ch;
		padding: 10px 14px;
		border-radius: 14px 14px 14px 4px;
		background: color-mix(in srgb, var(--accent) 9%, var(--panel));
		line-height: 1.5;
		font-size: 15px;
	}
	.who {
		display: block;
		font-family: var(--mono);
		font-size: 11px;
		color: var(--ink-soft);
		margin-bottom: 2px;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-left: auto;
	}
	.status {
		font-family: var(--mono);
		font-size: 11px;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.speed {
		display: inline-flex;
		border: 1px solid var(--line);
		border-radius: 8px;
		overflow: hidden;
	}
	.speed button,
	.replay {
		font: inherit;
		font-size: 12px;
		font-weight: 500;
		padding: 6px 10px;
		border: 0;
		background: transparent;
		color: var(--foreground);
		cursor: pointer;
	}
	.speed button[aria-pressed='true'] {
		background: color-mix(in srgb, var(--foreground) 8%, transparent);
	}
	.replay {
		padding: 6px 12px;
		border-radius: 8px;
		background: var(--accent);
		color: var(--accent-ink);
	}
	.replay:hover {
		background: color-mix(in srgb, var(--accent) 88%, var(--foreground));
	}

	.panes {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
		grid-template-areas: 'json render';
		height: 640px;
	}
	.label {
		font-family: var(--mono);
		font-size: 11px;
		letter-spacing: 0.04em;
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
		border-radius: 10px;
		background: var(--foreground);
		color: var(--background);
		font-size: 14px;
	}
	.checkout-note {
		margin: 0;
		max-width: 560px;
		padding: 10px 14px;
		border-radius: 10px;
		font-size: 14px;
		line-height: 1.45;
		background: color-mix(in srgb, var(--accent) 9%, var(--panel));
	}
	.checkout-note[data-busy='false'] {
		background: color-mix(in srgb, hsl(0 72% 51%) 10%, var(--panel));
		color: color-mix(in srgb, hsl(0 72% 40%) 80%, var(--foreground));
	}
	.events {
		list-style: none;
		margin: 0;
		padding: 0;
		font-family: var(--mono);
		font-size: 11px;
		color: var(--ink-soft);
	}
	.json {
		grid-area: json;
		display: flex;
		flex-direction: column;
		min-height: 0;
		background: color-mix(in srgb, var(--ground) 70%, var(--panel));
		border-right: 1px solid var(--line);
	}
	.json summary {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		padding: 14px 16px 0;
		cursor: pointer;
		list-style: none;
	}
	.json summary span {
		color: var(--ink-soft);
		opacity: 0.8;
	}
	.json[open] {
		overflow: hidden;
	}
	.json pre {
		margin: 0;
		padding: 12px 16px 16px;
		height: calc(640px - 40px);
		overflow: auto;
		font-size: 11.5px;
		line-height: 1.55;
		color: var(--ink-soft);
		white-space: pre-wrap;
		word-break: break-all;
	}

	.foot {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px;
		margin-top: 64px;
		padding: 24px 0 32px;
		border-top: 1px solid var(--line);
		font-size: 13px;
		color: var(--ink-soft);
	}
	.foot a {
		color: inherit;
	}

	@media (max-width: 720px) {
		.live {
			padding: 0 16px;
		}
		.head {
			padding: 40px 0 24px;
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
		.json summary {
			padding-bottom: 14px;
		}
		.json pre {
			height: 260px;
		}
		.controls {
			margin-left: 0;
			width: 100%;
		}
		.status {
			margin-right: auto;
		}
	}
</style>
