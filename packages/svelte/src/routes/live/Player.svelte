<!--
  @file routes/live/Player.svelte
  @description One /live run, replayed in place: the prompt, speed and Replay
    controls, the render frame and the model output pane (pretty-printed as it
    streams, JsonLines). Mounting it plays the run through streamSpec into
    <Ripple>; with reduced motion it shows the finished card at once (the
    thumbnail capture relies on that, and marks the frame data-thumb). A card's
    host events land in onHostEvent: the order demo's checkout `api` event goes
    to checkout.ts and the test store (PUBLIC_STORE_URL), and the returned
    payment link shows as the PayCard the landing chat uses, so the page never
    navigates away. Local tokens are prefixed (--live-*) so the widgets in the
    frame keep their own --accent and --radius.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Ripple, type RippleEvent } from '$lib/index.js';
	import { streamSpec, type StreamSpecStore } from '$lib/streaming/index.js';
	import JsonLines from '$lib/site/JsonLines.svelte';
	import { replay } from './replay.js';
	import type { Scenario } from './scenarios.js';
	import { checkout, isCheckoutEvent, type Pay } from './checkout.js';
	import PayCard from '../pawbar/PayCard.svelte';
	import type { Phase } from '../pay/watch.svelte.js';

	let { run: scenario, storeUrl }: { run: Scenario; storeUrl: string } = $props();

	const fullText = (s: Scenario) => s.fixture.chunks.map((c) => c.text).join('');

	let speed = $state(1);
	let typed = $state('');
	let store = $state<StreamSpecStore | null>(null);
	let take = $state(0);
	let jsonOpen = $state(true);
	let pre = $state<HTMLPreElement>();
	let controller: AbortController | null = null;

	const total = $derived(fullText(scenario).length);
	const restingSpec = $derived(JSON.parse(fullText(scenario)));
	const streaming = $derived(store != null && !store.done);
	const handWritten = $derived(scenario.fixture.model === 'hand-written');

	async function* tap(source: AsyncIterable<string>) {
		for await (const text of source) {
			typed += text;
			yield text;
		}
	}

	function play() {
		controller?.abort();
		controller = new AbortController();
		typed = '';
		events = [];
		checkoutNote = null;
		take++;
		store = streamSpec(tap(replay(scenario.fixture, { speed, signal: controller.signal })), {
			signal: controller.signal,
			throttleMs: 40
		});
	}

	function setSpeed(n: number) {
		speed = n;
		if (streaming) play();
	}

	// Host side of the generated UI. Every action the spec fires that Ripple
	// does not handle itself (toast, emit, navigate, api, ...) lands here.
	let checkoutNote = $state<{ busy: boolean; text: string } | null>(null);
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
		const result = await checkout(body, { storeUrl, pageOrigin: location.origin });
		if (result.ok) {
			pay = result.data;
			lastOrder = body;
			checkoutNote = null;
		} else checkoutNote = { busy: false, text: result.error.message };
		return result;
	}

	// Follow the stream while it is arriving.
	$effect(() => {
		void typed;
		if (streaming && pre) pre.scrollTop = pre.scrollHeight;
	});

	onMount(() => {
		if (window.matchMedia('(max-width: 720px)').matches) jsonOpen = false;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) typed = fullText(scenario);
		else play();
		return () => controller?.abort();
	});
</script>

<section class="stage" aria-label="Replay of {scenario.title}">
	<div class="bar">
		<p class="bubble"><span class="who">Prompt</span>{scenario.fixture.prompt}</p>
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
			<div class="frame" data-thumb>
				{#key take}
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
			{#if pay && scenario.needsStore}
				{#key pay.sessionId}<PayCard {pay} {storeUrl} onretry={() => placeOrder(lastOrder)} onphase={(p) => (payPhase = p)} />{/key}
			{/if}
			{#if checkoutNote && scenario.needsStore}
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
			<summary class="label">
				{handWritten ? 'card spec' : 'model output'}
				<span>{handWritten ? 'hand-written' : scenario.fixture.model}, {total} bytes</span>
			</summary>
			<pre bind:this={pre}><JsonLines text={typed} /></pre>
		</details>
	</div>
</section>

<style>
	.stage {
		--live-accent: var(--primary);
		--panel: var(--card);
		--ink-soft: var(--site-soft);
		--line: var(--site-line);
		--live-radius: var(--radius-card);
		border: 1px solid var(--line);
		border-radius: var(--live-radius);
		background: var(--panel);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}
	pre {
		font-family: var(--font-mono);
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
		font-family: var(--font-mono);
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
