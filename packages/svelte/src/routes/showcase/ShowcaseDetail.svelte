<!--
  @file routes/showcase/ShowcaseDetail.svelte
  @description The detail view shared by /showcase/w/<type> and
    /showcase/flows/<id>: a title block, then one live render with a toolbar
    (Preview | Spec (JsonLines, highlighted), Fill / 768 / 390 frame widths, Copy spec, Open in
    Playground through the ?s= encoder, Docs when the item is a widget). When
    an item has several specs (a widget's example plus its pockets) a row of
    variants picks one. The render is the page's only Ripple root and stays out
    of the search index; the title and line are what search shows.
-->
<script lang="ts">
	import { Ripple } from '$lib/index.js';
	import JsonLines from '$lib/site/JsonLines.svelte';
	import { playgroundHref } from '$lib/site/specFromUrl.js';

	let {
		title,
		line,
		category,
		back,
		docs,
		specs
	}: {
		title: string;
		line: string;
		category: string;
		back: { href: string; label: string };
		docs?: string;
		specs: { name: string; spec: Record<string, unknown> }[];
	} = $props();

	const WIDTHS = [
		{ id: 'fill', label: 'Fill', px: undefined },
		{ id: '768', label: '768', px: 768 },
		{ id: '390', label: '390', px: 390 }
	] as const;

	let picked = $state(0);
	let view = $state<'preview' | 'spec'>('preview');
	let width = $state<(typeof WIDTHS)[number]['id']>('fill');
	let copied = $state(false);

	const current = $derived(specs[Math.min(picked, specs.length - 1)]);
	const json = $derived(JSON.stringify(current.spec, null, 2));
	const playground = $derived(playgroundHref(current.spec));
	const px = $derived(WIDTHS.find((w) => w.id === width)?.px);

	async function copy() {
		await navigator.clipboard.writeText(json);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<article class="detail">
	<nav class="crumbs" aria-label="Breadcrumb">
		<a href="/showcase">Showcase</a>
		<span aria-hidden="true">/</span>
		<a href={back.href}>{back.label}</a>
	</nav>
	<header class="head">
		<h1>{title}</h1>
		<p class="line">{#each line.split('`') as part, i (i)}{#if i % 2}<code>{part}</code>{:else}{part}{/if}{/each}</p>
		<p class="cat">{category}</p>
	</header>

	{#if specs.length > 1}
		<div class="variants" role="group" aria-label="Examples">
			{#each specs as s, i (s.name)}
				<button type="button" aria-pressed={picked === i} onclick={() => (picked = i)}>{s.name}</button>
			{/each}
		</div>
	{/if}

	<div class="bar">
		<div class="seg" role="group" aria-label="View">
			<button type="button" aria-pressed={view === 'preview'} onclick={() => (view = 'preview')}>Preview</button>
			<button type="button" aria-pressed={view === 'spec'} onclick={() => (view = 'spec')}>Spec</button>
		</div>
		<div class="seg widths" role="group" aria-label="Frame width">
			{#each WIDTHS as w (w.id)}
				<button type="button" aria-pressed={width === w.id} disabled={view === 'spec'} onclick={() => (width = w.id)}>{w.label}</button>
			{/each}
		</div>
		<div class="actions">
			<button type="button" class="act" onclick={copy}>{copied ? 'Copied' : 'Copy spec'}</button>
			<span class="sr-only" aria-live="polite">{copied ? 'Spec copied' : ''}</span>
			{#if playground}
				<a class="act" href={playground}>Open in Playground</a>
			{:else}
				<span class="act off" title="This spec is too large for a playground link">Open in Playground</span>
			{/if}
			{#if docs}<a class="act" href={docs}>Docs</a>{/if}
		</div>
	</div>

	{#if view === 'preview'}
		<div class="stage">
			<div class="site-frame render" style:max-width={px ? `${px}px` : undefined} data-pagefind-ignore="all">
				{#key current}
					<Ripple spec={current.spec} />
				{/key}
			</div>
		</div>
	{:else}
		<pre class="spec"><JsonLines text={json} highlight /></pre>
	{/if}
</article>

<style>
	.detail {
		box-sizing: border-box;
		width: 100%;
		max-width: 1360px;
		margin: 0 auto;
		padding: 40px var(--site-gutter) 96px;
	}
	.crumbs {
		display: flex;
		gap: 8px;
		font: 400 14px/1.4 var(--font-sans);
		color: var(--site-soft);
	}
	.crumbs a {
		color: var(--site-soft);
		text-decoration: none;
	}
	.crumbs a:hover {
		color: var(--site-ink);
	}
	.head {
		margin: 16px 0 28px;
		max-width: 68ch;
	}
	h1 {
		margin: 0;
		font: 600 36px/1.1 var(--font-sans);
		letter-spacing: -0.025em;
		color: var(--site-ink);
	}
	.line {
		margin: 12px 0 0;
		overflow-wrap: anywhere;
		font: 400 17px/1.55 var(--font-sans);
		color: var(--site-soft);
		text-wrap: pretty;
	}
	.line code {
		font: 0.9em/1 var(--font-mono);
	}
	.cat {
		margin: 8px 0 0;
		font: 400 14px/1.4 var(--font-sans);
		color: var(--site-soft);
	}
	.variants {
		display: flex;
		gap: 6px;
		margin-bottom: 12px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.variants button {
		flex: none;
		font: 500 13px/1 var(--font-sans);
		padding: 8px 12px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-soft);
		cursor: pointer;
	}
	.variants button[aria-pressed='true'] {
		color: var(--site-ink);
		background: var(--site-pressed);
	}
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-left: auto;
	}
	.seg {
		display: inline-flex;
		padding: 2px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
	}
	.seg button,
	.act {
		font: 500 13px/1 var(--font-sans);
		padding: 7px 11px;
		border: 0;
		border-radius: calc(var(--radius-control) - 2px);
		background: transparent;
		color: var(--site-soft);
		cursor: pointer;
		text-decoration: none;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.seg button:hover:not(:disabled),
	.act:hover:not(.off),
	.variants button:hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	.seg button[aria-pressed='true'] {
		color: var(--site-ink);
		background: var(--site-pressed);
	}
	.seg button:disabled {
		cursor: default;
		opacity: 0.5;
	}
	a.act {
		color: var(--primary-ink);
	}
	.act.off {
		cursor: default;
		opacity: 0.5;
	}
	.seg button:focus-visible,
	.act:focus-visible,
	.variants button:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.stage {
		padding: 24px;
		border-radius: var(--radius-card);
		background: var(--code-bg);
	}
	.render {
		margin: 0 auto;
		min-height: 240px;
		overflow-x: auto;
	}
	.spec {
		margin: 0;
		max-height: 70vh;
		padding: 16px 18px;
		overflow: auto;
		border: 1px solid var(--code-line);
		border-radius: var(--radius-card);
		background: var(--code-bg);
		color: var(--code-ink);
		font: 13.5px/1.6 var(--font-mono);
		font-variant-ligatures: none;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	@media (max-width: 639.98px) {
		.detail {
			padding-top: 24px;
		}
		h1 {
			font-size: 28px;
		}
		.stage {
			padding: 0;
			background: none;
		}
		.widths {
			display: none;
		}
		.actions {
			margin-left: 0;
		}
	}
</style>
