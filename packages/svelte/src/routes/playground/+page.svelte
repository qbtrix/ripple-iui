<!--
  @file routes/playground/+page.svelte
  @description /playground: ask for a tool, watch its spec stream into a UI.
    The chat is the landing's (pawbar/Chat.svelte, ChatSession, the recorded
    scenarios, the card policy). Default build: every answer is a recording
    replayed locally on its original timing, and the page says so; no model
    is called and nothing is fetched. PUBLIC_PAWBAR_LIVE=1 switches to the
    Paw Bar API with the recordings as the fallback, as on the landing.
    Layout: 1280 and up, chat | preview | JSON in three columns with drag
    grips; 1024 to 1279, chat | preview over JSON; under 1024 one column
    where the card renders inline in the chat and its JSON opens as a bottom
    sheet (a native <dialog>). From 1024 every card is a chip in the thread
    and the chip picks which version the panes show (versions.svelte.ts).
    The order demo is left out: its checkout is an `api` action the card
    policy refuses, so the chat offers the other eight recordings.
    Keys (keys.ts): Esc stops, / focuses the composer, Ctrl/Cmd+B hides the
    chat, Ctrl/Cmd+J toggles the JSON; Ctrl/Cmd+K stays docs search.
    A link with ?spec= or ?s= (lib/site/specFromUrl.ts, read in onMount since
    the page is prerendered) opens that spec straight into the preview as a
    "Shared spec" version, rendered as given rather than through the chat's
    card policy; a bad link says why and leaves the page empty.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import type { RippleEvent } from '$lib/index.js';
	import { specFromUrl } from '$lib/site/specFromUrl.js';
	import JsonPane from '$lib/site/playground/JsonPane.svelte';
	import PreviewPane from '$lib/site/playground/PreviewPane.svelte';
	import { shortcut } from '$lib/site/playground/keys.js';
	import {
		byteLength,
		currentVersion,
		ReplayVersion,
		sharedVersion,
		versionsOf,
		type Pick,
		type Version
	} from '$lib/site/playground/versions.svelte.js';
	import Chat from '../pawbar/Chat.svelte';
	import { Card, ChatSession, pawbarTransport, type Transport } from '../pawbar/session.svelte.js';
	import { cardChunks, findScenario, pickScenario, recordedEvents } from '../pawbar/recorded.js';
	import { replay } from '../live/replay.js';
	import { scenarios, type Scenario } from '../live/scenarios.js';

	// Opt-in: vite.config.ts defines these only when PUBLIC_PAWBAR_LIVE=1.
	const ENDPOINT: string = import.meta.env.PUBLIC_PAWBAR_ENDPOINT ?? '';
	const WIDGET_ID: string = import.meta.env.PUBLIC_PAWBAR_WIDGET_ID ?? '';
	const SITE_KEY: string = import.meta.env.PUBLIC_PAWBAR_SITE_KEY ?? '';
	const LIVE = import.meta.env.PUBLIC_PAWBAR_LIVE === '1' && Boolean(ENDPOINT && WIDGET_ID && SITE_KEY);

	const pool = scenarios.filter((s) => !s.needsStore);
	const intro = (message: string) =>
		findScenario(message, pool)
			? 'This is a recorded answer to a request like yours, played back on its original timing.'
			: 'Nothing recorded matches that yet, so this plays the recorded bill splitter.';
	const recorded: Transport = (message, signal) => recordedEvents(pickScenario(message, pool), { speed: 1.5, signal, intro: intro(message) });
	const session = LIVE
		? new ChatSession(pawbarTransport({ endpoint: ENDPOINT, widgetId: WIDGET_ID, siteKey: SITE_KEY }).send, recorded)
		: new ChatSession(recorded);

	const wide = new MediaQuery('min-width: 1024px', false);
	const three = new MediaQuery('min-width: 1280px', false);

	let chat = $state<{ ask: (text: string) => Promise<void>; focus: () => void }>();
	let pick = $state<Pick>(null);
	let shared = $state.raw<Version | null>(null);
	let urlError = $state<string | null>(null);
	let showChat = $state(true);
	let showJson = $state(true);
	let morePrompts = $state(false);
	/** Null until dragged: 400 from 1280, 360 below (CSS). */
	let chatW = $state<number | null>(null);
	let jsonW = $state(440);
	let jsonH = $state<number | null>(null);
	let sheet = $state<HTMLDialogElement>();
	let sheetVersion = $state.raw<Version | null>(null);
	let work = $state<HTMLElement>();

	const versions = $derived<Version[]>([...(shared ? [shared] : []), ...versionsOf(session.turns)]);
	const current = $derived(currentVersion(versions, pick));

	// Replay in the preview: a fresh stream of the shown version, its own Version.
	let replaying = $state.raw<{ of: string; version: ReplayVersion; abort: AbortController } | null>(null);
	const shown = $derived(replaying && replaying.of === current?.id ? replaying.version : current);

	const scenarioOf = (v: Version | null): Scenario | undefined => (v ? pool.find((s) => s.title === v.title) : undefined);
	const total = $derived.by(() => {
		const s = !LIVE || shown instanceof ReplayVersion ? scenarioOf(shown) : undefined;
		if (!s) return null;
		const chunks = shown instanceof ReplayVersion ? s.fixture.chunks : cardChunks(s.fixture);
		return byteLength(chunks.map((c) => c.text).join(''));
	});

	function startReplay() {
		const v = current;
		if (!v?.spec) return;
		replaying?.abort.abort();
		const abort = new AbortController();
		const s = scenarioOf(v);
		// A recording replays its whole spec on its own timing; anything else in even slices.
		const chunks = s
			? s.fixture.chunks
			: Array.from({ length: Math.ceil(JSON.stringify(v.spec).length / 64) }, (_, i) => ({ t: i * 30, text: JSON.stringify(v.spec).slice(i * 64, i * 64 + 64) }));
		const fixture = { id: v.id, title: v.title, prompt: '', model: '', recordedAt: '', chunks };
		replaying = { of: v.id, version: new ReplayVersion(v, replay(fixture, { speed: 1.5, signal: abort.signal }), abort.signal), abort };
	}

	function pickCard(card: Card) {
		replaying?.abort.abort();
		replaying = null;
		pick = { id: card.id, count: versions.length };
	}

	function hostEvent(v: Version, e: RippleEvent) {
		if (v instanceof Card) session.hostEvent(v, e);
	}

	function openSheet(v: Version | null) {
		if (!v) return;
		sheetVersion = v;
		sheet?.showModal();
	}

	function onkey(e: KeyboardEvent) {
		const s = shortcut(e);
		if (!s || sheet?.open) return;
		if (s === 'stop') {
			if (session.busy) session.stop();
			else if (replaying?.version.status === 'streaming') {
				replaying.abort.abort();
				replaying = null;
			} else return;
		} else if (s === 'focus') chat?.focus();
		else if (s === 'chat') {
			if (!wide.current) return;
			showChat = !showChat;
		} else if (s === 'json') {
			if (wide.current) showJson = !showJson;
			else openSheet(current);
		}
		e.preventDefault();
	}

	/** Pointer and arrow-key resizing for a grip; `sign` -1 when dragging toward the start grows the pane. */
	function grip(get: () => number, set: (n: number) => void, min: () => number, max: () => number, axis: 'x' | 'y', sign: 1 | -1) {
		const clamp = (n: number) => Math.round(Math.min(max(), Math.max(min(), n)));
		return {
			onpointerdown(e: PointerEvent) {
				const el = e.currentTarget as HTMLElement;
				const from = axis === 'x' ? e.clientX : e.clientY;
				const start = get();
				el.setPointerCapture(e.pointerId);
				const move = (m: PointerEvent) => set(clamp(start + sign * ((axis === 'x' ? m.clientX : m.clientY) - from)));
				const up = () => {
					el.removeEventListener('pointermove', move);
					el.removeEventListener('pointerup', up);
					el.removeEventListener('pointercancel', up);
				};
				el.addEventListener('pointermove', move);
				el.addEventListener('pointerup', up);
				el.addEventListener('pointercancel', up);
				e.preventDefault();
			},
			onkeydown(e: KeyboardEvent) {
				const back = axis === 'x' ? 'ArrowLeft' : 'ArrowUp';
				const fwd = axis === 'x' ? 'ArrowRight' : 'ArrowDown';
				if (e.key !== back && e.key !== fwd) return;
				e.preventDefault();
				set(clamp(get() + sign * (e.key === fwd ? 24 : -24)));
			}
		};
	}

	const chatGrip = grip(() => chatW ?? (three.current ? 400 : 360), (n) => (chatW = n), () => 300, () => 560, 'x', 1);
	const jsonGrip = grip(() => jsonW, (n) => (jsonW = n), () => 320, () => Math.max(320, (work?.clientWidth ?? 1200) - 480), 'x', -1);
	const splitGrip = grip(
		() => jsonH ?? Math.round((work?.clientHeight ?? 600) * 0.4),
		(n) => (jsonH = n),
		() => 120,
		() => Math.max(120, (work?.clientHeight ?? 600) - 200),
		'y',
		-1
	);

	const asked = $derived(new Set(session.turns.flatMap((t) => (t.role === 'user' && t.parts[0]?.kind === 'text' ? [t.parts[0].text] : []))));
	const tryAnother = $derived(
		session.turns.length
			? pool
					.filter((s) => !asked.has(s.fixture.prompt))
					.slice(0, 3)
					.map((s) => ({ id: s.id, title: s.title, prompt: s.fixture.prompt }))
			: []
	);

	onMount(() => {
		const linked = specFromUrl(location.search);
		if (linked && 'text' in linked) shared = sharedVersion(linked.text);
		else if (linked) urlError = linked.error;
		return () => {
			session.stop();
			replaying?.abort.abort();
		};
	});
</script>

<svelte:window onkeydown={onkey} />

<svelte:head>
	<title>Playground: ask for a tool, watch Ripple build it</title>
	<meta
		name="description"
		content="Ask for a small tool and watch its Ripple spec stream into a working UI, with the JSON beside it line by line. Answers are recorded model output, replayed in your browser."
	/>
</svelte:head>

{#snippet paneTools()}
	{#if wide.current && !showChat}
		<button type="button" class="pane-tool" title="Show the chat (Ctrl+B)" onclick={() => (showChat = true)}>Chat</button>
	{/if}
	{#if wide.current && !showJson}
		<button type="button" class="pane-tool" title="Show the JSON (Ctrl+J)" onclick={() => (showJson = true)}>JSON</button>
	{/if}
{/snippet}

<div
	class="pg"
	data-chat={showChat || undefined}
	data-json={showJson || undefined}
	style:--chat-w={chatW == null ? null : `${chatW}px`}
	style:--json-w="{jsonW}px"
	style:--json-h={jsonH == null ? null : `${jsonH}px`}
>
	<section class="chat-col" aria-label="Chat">
		<header class="col-head">
			<h1 class="col-title">Playground</h1>
			<span class="mode">{LIVE ? 'Live model' : 'Recorded answers'}</span>
			<button type="button" class="pane-tool hide-chat" title="Hide the chat (Ctrl+B)" onclick={() => (showChat = false)}>Hide</button>
		</header>
		<div class="chat-scroll">
			{#if urlError}<p class="url-error" role="alert">{urlError}</p>{/if}
			{#if shared}
				<p class="shared-note">
					Opened the spec from your link. It is in the preview{wide.current ? '' : ' below'}, and the chat works as usual.
					{#if wide.current && current?.id !== 'shared'}
						<button type="button" class="more inline" onclick={() => (pick = { id: 'shared', count: versions.length })}>Show it again</button>
					{/if}
				</p>
				{#if !wide.current}
					<div class="inline-preview">
						<PreviewPane version={shared} active onevent={hostEvent}>
							{#snippet tools()}<button type="button" class="pane-tool" onclick={() => openSheet(shared)}>JSON</button>{/snippet}
						</PreviewPane>
					</div>
				{/if}
			{/if}
			{#if !session.turns.length}
				<div class="welcome">
					<h2>Ask for a tool. Watch it build.</h2>
					<p>
						The answer is a Ripple spec, and the UI renders while the JSON is still arriving. {LIVE
							? 'Answers come from a live model.'
							: 'Every answer here is a recorded model run, replayed in your browser; nothing is sent anywhere.'}
					</p>
					<ul class="prompts" aria-label="Recorded requests">
						{#each morePrompts ? pool : pool.slice(0, 3) as s (s.id)}
							<li>
								<button type="button" class="prompt" disabled={session.busy} onclick={() => chat?.ask(s.fixture.prompt)}>
									<span class="prompt-top"><span class="prompt-title">{s.title}</span><span class="prompt-cat">{s.category}</span></span>
									<span class="prompt-text">{s.fixture.prompt}</span>
								</button>
							</li>
						{/each}
					</ul>
					<button type="button" class="more" aria-expanded={morePrompts} onclick={() => (morePrompts = !morePrompts)}>
						{morePrompts ? 'Fewer' : `All ${pool.length} recordings`}
					</button>
				</div>
			{/if}
			<Chat
				bind:this={chat}
				{session}
				suggestions={tryAnother}
				chips={wide.current ? { viewing: current?.id ?? null, pick: pickCard } : null}
				onspec={wide.current ? undefined : (card) => openSheet(card)}
			/>
		</div>
	</section>

	<!-- svelte-ignore a11y_no_noninteractive_tabindex (a focusable separator is the ARIA window-splitter pattern) -->
	<div
		class="grip grip-chat"
		role="separator"
		aria-orientation="vertical"
		aria-label="Resize the chat"
		aria-valuenow={chatW ?? (three.current ? 400 : 360)}
		aria-valuemin={300}
		aria-valuemax={560}
		tabindex="0"
		{...chatGrip}
	></div>

	<div class="work" bind:this={work}>
		<div class="preview">
			<PreviewPane version={shown} active={wide.current} {total} onreplay={startReplay} onevent={hostEvent} tools={paneTools} />
		</div>
		{#if three.current}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (window splitter) -->
			<div
				class="grip grip-json"
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize the JSON"
				aria-valuenow={jsonW}
				tabindex="0"
				{...jsonGrip}
			></div>
		{:else}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (window splitter) -->
			<div
				class="grip grip-json"
				role="separator"
				aria-orientation="horizontal"
				aria-label="Resize the JSON"
				aria-valuenow={jsonH ?? undefined}
				tabindex="0"
				{...splitGrip}
			></div>
		{/if}
		<div class="json">
			<JsonPane version={shown} onhide={() => (showJson = false)} />
		</div>
	</div>
</div>

<dialog class="sheet" bind:this={sheet} aria-label="JSON spec" onclose={() => (sheetVersion = null)}>
	<div class="sheet-inner">
		<JsonPane version={sheetVersion} sheet />
		<form method="dialog" class="sheet-foot"><button class="sheet-close">Close</button></form>
	</div>
</dialog>

<style>
	/* Phones and tablets: one column in the page flow. */
	.pg {
		max-width: 760px;
		margin: 0 auto;
		padding: 16px var(--site-gutter) 40px;
	}
	.work,
	.grip,
	.col-head .hide-chat {
		display: none;
	}
	.col-head {
		display: flex;
		align-items: baseline;
		gap: 12px;
		margin-bottom: 8px;
	}
	.col-title {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
	}
	.mode {
		font-size: 13px;
		color: var(--site-soft);
	}
	.chat-scroll {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}
	.welcome h2 {
		margin: 8px 0 6px;
		font-size: 28px;
		line-height: 1.15;
		letter-spacing: -0.01em;
		text-wrap: balance;
	}
	.welcome p {
		margin: 0 0 16px;
		max-width: 52ch;
		color: var(--site-soft);
		line-height: 1.55;
	}
	.prompts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	.prompt {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
		min-height: 44px;
		padding: 10px 14px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: transparent;
		color: var(--site-ink);
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: background 0.15s;
	}
	.prompt:hover:not(:disabled) {
		background: var(--site-hover);
	}
	.prompt:disabled {
		cursor: default;
		color: var(--site-soft);
	}
	.prompt-top {
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}
	.prompt-title {
		font-size: 14px;
		font-weight: 600;
	}
	.prompt-cat {
		font-size: 12.5px;
		color: var(--site-soft);
	}
	.prompt-text {
		font-size: 13.5px;
		line-height: 1.45;
		color: var(--site-soft);
		overflow-wrap: anywhere;
	}
	.more {
		margin-top: 6px;
		min-height: 44px;
		padding: 0 4px;
		border: 0;
		background: none;
		color: var(--primary-ink);
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
	.more.inline {
		min-height: 0;
		margin: 0 0 0 4px;
		padding: 0;
		font-size: inherit;
	}
	.shared-note,
	.url-error {
		margin: 0;
		padding: 10px 14px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		font-size: 14px;
		line-height: 1.5;
	}
	.url-error {
		border-color: color-mix(in oklch, var(--destructive) 45%, transparent);
	}
	.inline-preview {
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		overflow: hidden;
	}
	.pane-tool {
		min-height: 32px;
		padding: 0 10px;
		border: 0;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-soft);
		font: inherit;
		font-size: 12.5px;
		cursor: pointer;
	}
	.pane-tool:hover {
		background: var(--site-hover);
		color: var(--site-ink);
	}
	.prompt:focus-visible,
	.more:focus-visible,
	.pane-tool:focus-visible,
	.grip:focus-visible,
	.sheet-close:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	/* From 1024: a fixed-height workspace under the top bar, each column scrolling on its own. */
	@media (min-width: 1024px) {
		.pg {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			max-width: none;
			height: calc(100dvh - var(--site-topbar));
			margin: 0;
			padding: 0;
			border-bottom: 1px solid var(--site-line);
		}
		.pg[data-chat] {
			grid-template-columns: var(--chat-w, 360px) 0 minmax(0, 1fr);
		}
		.chat-col {
			display: none;
			flex-direction: column;
			min-height: 0;
			min-width: 0;
		}
		.pg[data-chat] .chat-col {
			display: flex;
		}
		.col-head {
			align-items: center;
			min-height: 44px;
			margin: 0;
			padding: 0 6px 0 16px;
			border-bottom: 1px solid var(--site-line);
		}
		.col-head .hide-chat {
			display: inline-block;
			margin-left: auto;
		}
		.chat-scroll {
			flex: 1;
			min-height: 0;
			overflow-y: auto;
			overscroll-behavior: contain;
			padding: 16px 16px 12px;
		}
		.work {
			display: grid;
			grid-template-rows: minmax(0, 1fr);
			min-width: 0;
			min-height: 0;
			border-left: 1px solid var(--site-line);
		}
		.pg[data-chat] .grip-chat {
			display: block;
		}
		.preview,
		.json {
			min-width: 0;
			min-height: 0;
		}
		.json {
			display: none;
		}
		/* 1024 to 1279: the JSON under the preview, both in view while it streams. */
		.pg[data-json] .work {
			grid-template-rows: minmax(0, 1fr) 0 var(--json-h, 40%);
		}
		.pg[data-json] .json {
			display: block;
			border-top: 1px solid var(--site-line);
		}
		.pg[data-json] .grip-json {
			display: block;
		}
	}
	@media (min-width: 1280px) {
		.pg[data-chat] {
			grid-template-columns: var(--chat-w, 400px) 0 minmax(0, 1fr);
		}
		.pg[data-json] .work {
			grid-template-rows: minmax(0, 1fr);
			grid-template-columns: minmax(480px, 1fr) 0 var(--json-w);
		}
		.pg[data-json] .json {
			border-top: 0;
			border-left: 1px solid var(--site-line);
		}
	}

	/* Grips: zero-width tracks with a wider invisible hit area over the border. */
	.grip {
		position: relative;
		z-index: 2;
		touch-action: none;
	}
	.grip::after {
		content: '';
		position: absolute;
		inset: 0 -4px;
		cursor: col-resize;
	}
	.grip:hover::after,
	.grip:focus-visible::after {
		background: color-mix(in oklch, var(--primary) 35%, transparent);
		inset: 0 -1px;
	}
	.grip[aria-orientation='horizontal']::after {
		inset: -4px 0;
		cursor: row-resize;
	}
	.grip[aria-orientation='horizontal']:hover::after,
	.grip[aria-orientation='horizontal']:focus-visible::after {
		inset: -1px 0;
	}

	/* Phone bottom sheet for a card's JSON. */
	.sheet {
		width: 100%;
		max-width: 760px;
		max-height: min(80dvh, 720px);
		margin: auto auto 0;
		padding: 0;
		border: 1px solid var(--site-line);
		border-bottom: 0;
		border-radius: var(--radius-card) var(--radius-card) 0 0;
		background: var(--site-ground);
		color: var(--site-ink);
	}
	.sheet::backdrop {
		background: color-mix(in oklch, black 40%, transparent);
	}
	.sheet-inner {
		display: flex;
		flex-direction: column;
		height: min(80dvh, 720px);
	}
	.sheet-inner > :global(:first-child) {
		flex: 1;
		min-height: 0;
	}
	.sheet-foot {
		display: flex;
		justify-content: flex-end;
		padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
		border-top: 1px solid var(--site-line);
		margin: 0;
	}
	.sheet-close {
		min-height: 44px;
		padding: 0 18px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-ink);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	@media (max-width: 639px) {
		.pg {
			padding-inline: 16px;
		}
	}
</style>
