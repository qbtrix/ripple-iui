<!--
  @file lib/site/playground/PreviewPane.svelte
  @description The playground's preview of one version. Toolbar: the title, a
    width segment (Fill, 768, 390; it narrows the frame, and since this is not
    an iframe only container-query widgets respond to it), a light/dark toggle
    for the frame alone (theme.ts pins the page's root tokens inline, because
    :root-only aliases would not follow a nested .dark), Replay and Reset, and
    a `tools` snippet the page fills (reopen the chat or the JSON). The frame
    renders the final spec, or the stream while it arrives; when `active` is
    false it renders nothing, so a card shown inline in the chat on a phone is
    never mounted twice. A spec whose root is a `card` gets a bare frame. The
    status strip says how far the stream is (a real bar when the total is
    known), then "Valid, N nodes" or the specIssues problems, or why a card was
    left out; never a silent partial. Host events land in a collapsible log,
    only once the version is final (the chat's cards are inert until then).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createSubscriber } from 'svelte/reactivity';
	import { Ripple, specIssues, type RippleEvent } from '$lib/index.js';
	import { themeStyle, type Theme } from './theme.js';
	import { byteLength, countNodes, formatBytes, type Version } from './versions.svelte.js';

	let {
		version,
		active = true,
		total = null,
		onreplay,
		onevent,
		tools
	}: {
		version: Version | null;
		/** Render the UI here (false while the chat shows it inline). */
		active?: boolean;
		/** The full byte size when known (a recording), for a real progress bar. */
		total?: number | null;
		onreplay?: () => void;
		onevent?: (version: Version, event: RippleEvent) => void;
		tools?: Snippet;
	} = $props();

	const WIDTHS = [
		{ id: 'fill', label: 'Fill', px: null },
		{ id: '768', label: '768', px: 768 },
		{ id: '390', label: '390', px: 390 }
	] as const;
	let width = $state<(typeof WIDTHS)[number]['id']>('fill');
	let theme = $state<Theme | null>(null);
	let run = $state(0);
	let events = $state<{ id: number; text: string }[]>([]);
	let eventSeq = 0;

	// The page's own theme, read live from <html class="dark">.
	const siteTheme = createSubscriber((update) => {
		const mo = new MutationObserver(update);
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => mo.disconnect();
	});
	const pageTheme = (): Theme => {
		siteTheme();
		return typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light';
	};
	const shownTheme = $derived(theme ?? pageTheme());
	const frameStyle = $derived(theme && theme !== pageTheme() ? themeStyle(theme) : '');

	const streaming = $derived(version?.status === 'streaming');
	const bytes = $derived(byteLength(version?.text ?? ''));
	const issues = $derived(version?.status === 'final' && version.spec ? specIssues(version.spec) : []);
	const nodes = $derived(version?.spec ? countNodes(version.spec.ui) : 0);
	const streamError = $derived(version?.store?.error ?? null);
	const bare = $derived.by(() => {
		const ui = (version?.spec ?? version?.store?.current)?.ui as { type?: unknown } | undefined;
		return ui?.type === 'card';
	});

	// A different version clears the log and the remount key.
	let shownId: string | undefined;
	$effect.pre(() => {
		const id = version?.id;
		if (id === shownId) return;
		shownId = id;
		events = [];
	});

	function hostEvent(event: RippleEvent) {
		if (!version) return undefined;
		onevent?.(version, event);
		if (version.status !== 'final') return undefined;
		const e = event as RippleEvent & { action?: string; message?: unknown; target?: unknown; url?: unknown };
		const kind = String(e.action ?? e.type ?? 'event');
		const detail = [e.message, e.target, e.url].find((v) => typeof v === 'string' && v) as string | undefined;
		events = [{ id: ++eventSeq, text: detail ? `${kind}: ${detail}` : kind }, ...events].slice(0, 20);
		return undefined;
	}

	function reset() {
		run++;
		events = [];
	}

	const reason = (r: string | null) =>
		r === 'truncated' ? 'The stream was cut off before the card finished.' : `The card did not pass its checks (${r ?? 'invalid'}).`;
</script>

<section class="pane" aria-label="Preview">
	<header class="bar">
		<h2 class="title">{version?.title || 'Preview'}</h2>
		<div class="seg widths" role="group" aria-label="Preview width">
			{#each WIDTHS as w (w.id)}
				<button type="button" aria-pressed={width === w.id} onclick={() => (width = w.id)}>{w.label}</button>
			{/each}
		</div>
		<div class="seg" role="group" aria-label="Preview theme">
			{#each ['light', 'dark'] as const as t (t)}
				<button type="button" aria-pressed={shownTheme === t} onclick={() => (theme = t)}>{t === 'light' ? 'Light' : 'Dark'}</button>
			{/each}
		</div>
		<button type="button" class="tool" disabled={!version?.spec || streaming || !onreplay} onclick={() => onreplay?.()}>Replay</button>
		<button type="button" class="tool" disabled={!version?.spec || streaming} title="Put the UI back to its first state" onclick={reset}>Reset</button>
		{#if tools}<span class="extra">{@render tools()}</span>{/if}
	</header>

	<div class="stage">
		{#if !version}
			<div class="empty">
				<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"
					><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5" /><path
						d="M3.5 9h17M9 9v10.5"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					/></svg
				>
				<p>Your UI renders here while its spec streams.</p>
			</div>
		{:else if version.status === 'rejected'}
			<p class="alert" role="alert">{reason(version.reason)} Nothing from it is rendered.</p>
		{:else}
			<div class="frame" style:max-width={WIDTHS.find((w) => w.id === width)?.px ? `${WIDTHS.find((w) => w.id === width)?.px}px` : null}>
				<div class="surface" class:dark={shownTheme === 'dark'} data-bare={bare || undefined} style={frameStyle || undefined}>
					{#if active}
						{#key `${version.id}:${run}`}
							{#if version.status === 'final' && version.spec}
								<Ripple spec={version.spec} onEvent={hostEvent} />
							{:else if version.store}
								<Ripple streaming={version.store} skeleton="card" onEvent={hostEvent} />
							{/if}
						{/key}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<footer class="strip">
		<p class="state" aria-live="off">
			{#if !version}
				No spec yet
			{:else if streamError}
				<span class="bad">The stream could not be parsed: {streamError.message}</span>
			{:else if streaming}
				<span class="dot" aria-hidden="true"></span>
				<span>Streaming {formatBytes(bytes)}{total ? ` / ${formatBytes(total)}` : ''}</span>
				{#if total}
					<span class="meter" aria-hidden="true"><span style:transform="scaleX({Math.min(1, bytes / total)})"></span></span>
				{/if}
			{:else if version.status === 'rejected'}
				<span class="bad">Left out</span>
			{:else if issues.length}
				<span class="bad">{issues.length} {issues.length === 1 ? 'problem' : 'problems'}:</span>
				<span class="issues">{issues
						.slice(0, 3)
						.map((i) => `${i.path}: ${i.message}`)
						.join('; ')}</span>
			{:else}
				<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
				<span>Valid, {nodes} {nodes === 1 ? 'node' : 'nodes'}, {formatBytes(bytes)}</span>
			{/if}
		</p>
		<details class="events">
			<summary>Host events ({events.length})</summary>
			<div class="log">
				{#if events.length}
					<ol>
						{#each events as ev (ev.id)}<li>{ev.text}</li>{/each}
					</ol>
					<button type="button" class="tool" onclick={() => (events = [])}>Clear</button>
				{:else}
					<p>None yet. Click something in the UI; the events it sends to the page land here.</p>
				{/if}
			</div>
		</details>
	</footer>
</section>

<style>
	.pane {
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		height: 100%;
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 8px 0 14px;
		border-bottom: 1px solid var(--site-line);
		overflow-x: auto;
		scrollbar-width: none;
	}
	.title {
		flex: 1;
		min-width: 6ch;
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.seg {
		display: flex;
		flex: none;
		padding: 2px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
	}
	.seg button,
	.tool {
		min-height: 28px;
		padding: 0 9px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--site-soft);
		font: inherit;
		font-size: 12.5px;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.seg button[aria-pressed='true'] {
		background: var(--site-pressed);
		color: var(--site-ink);
	}
	.seg button:hover,
	.tool:hover:not(:disabled) {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	.tool {
		flex: none;
		min-height: 32px;
	}
	.tool:disabled {
		cursor: default;
		background: none;
		color: var(--site-soft);
	}
	.seg button:focus-visible,
	.tool:focus-visible,
	.events summary:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}
	.extra {
		display: flex;
		flex: none;
		gap: 2px;
	}

	.stage {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 20px;
		background: var(--code-bg);
	}
	.frame {
		margin: 0 auto;
		min-width: 0;
		container-type: inline-size;
	}
	.surface {
		padding: 20px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--background);
		color: var(--foreground);
		overflow-x: auto;
	}
	/* The spec's root is a card widget: its card is the surface. */
	.surface[data-bare] {
		padding: 0;
		border: 0;
		background: none;
		overflow: visible;
	}
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		height: 100%;
		min-height: 200px;
		color: var(--site-soft);
		text-align: center;
	}
	.empty p {
		margin: 0;
		font-size: 14px;
	}
	.alert {
		margin: 0;
		padding: 10px 14px;
		border: 1px solid color-mix(in oklch, var(--destructive) 45%, transparent);
		border-radius: var(--radius-control);
		background: var(--site-ground);
		font-size: 14px;
		line-height: 1.5;
	}

	.strip {
		border-top: 1px solid var(--site-line);
		font-size: 12.5px;
		color: var(--site-soft);
	}
	.state {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 36px;
		margin: 0;
		padding: 0 14px;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		overflow: hidden;
	}
	.state svg {
		flex: none;
		color: var(--site-ink);
	}
	.issues {
		overflow: hidden;
		text-overflow: ellipsis;
		font-family: var(--font-mono);
	}
	.bad {
		color: var(--site-ink);
		font-weight: 600;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--primary);
		animation: pulse 1.4s ease-in-out infinite;
	}
	.meter {
		flex: 0 1 140px;
		height: 3px;
		border-radius: 2px;
		background: var(--site-line);
		overflow: hidden;
	}
	.meter span {
		display: block;
		height: 100%;
		background: var(--primary);
		transform-origin: left;
		transition: transform 120ms linear;
	}
	.events {
		border-top: 1px solid var(--site-line);
	}
	.events summary {
		display: flex;
		align-items: center;
		min-height: 32px;
		padding: 0 14px;
		cursor: pointer;
		list-style-position: inside;
	}
	.log {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 0 8px 10px 14px;
		max-height: 120px;
		overflow: auto;
	}
	.log ol {
		flex: 1;
		margin: 0;
		padding: 0;
		list-style: none;
		font-family: var(--font-mono);
		color: var(--site-ink);
		overflow-wrap: anywhere;
	}
	.log p {
		margin: 0;
	}
	@keyframes pulse {
		50% {
			opacity: 0.35;
		}
	}
	@media (max-width: 639px) {
		.widths {
			display: none;
		}
		.stage {
			padding: 12px;
		}
		.surface {
			padding: 12px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
		}
		.meter span {
			transition: none;
		}
	}
</style>
