<!--
  @file routes/showcase/+page.svelte
  @description The showcase index: a spotlight flow rendered live, then every
    example as a card under four facets (Apps, Widgets, Patterns, Flows) with
    counts, a category row for widgets and search as you type. Cards and
    filtering come from +page.server.ts (widget previews are the docs pages'
    own specs) and $lib/site/showcase/catalog.ts. The facet, category and query
    live in the URL (?f=widgets&c=data&q=chart): the page is prerendered, so
    the URL is read on mount and written back with replaceState, never pushed.
    Only the spotlight renders at load; cards mount their previews as they near
    the viewport (ShowcaseCard).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { Ripple } from '$lib/index.js';
	import {
		DEFAULT_FACET,
		FACETS,
		categoryCounts,
		facetCounts,
		filterItems,
		parseState,
		toSearch,
		type Facet,
		type ShowcaseItem,
		type ShowcaseState
	} from '$lib/site/showcase/catalog.js';
	import { playgroundHref } from '$lib/site/specFromUrl.js';
	import ShowcaseCard from './ShowcaseCard.svelte';

	let { data } = $props();

	let st = $state<ShowcaseState>({ f: DEFAULT_FACET, c: '', q: '' });
	onMount(() => {
		st = parseState(location.search);
	});

	function set(next: Partial<ShowcaseState>) {
		st = { ...st, ...next };
		if (st.f !== 'widgets') st.c = '';
		replaceState(`${location.pathname}${toSearch(st)}`, {});
	}

	const counts = $derived(facetCounts(data.items, st.q));
	const totals = $derived(facetCounts(data.items, ''));
	const cats = $derived(categoryCounts(data.items, st.q, data.categories.map((c) => c.id)));
	const shown = $derived(filterItems(data.items, st));
	const catTitle = $derived(Object.fromEntries(data.categories.map((c) => [c.id, c.title])));
	const spotlightPlayground = $derived(playgroundHref(data.spotlight.spec));

	const NOUN: Record<Facet, [string, string]> = {
		apps: ['app', 'apps'],
		widgets: ['widget', 'widgets'],
		patterns: ['pattern', 'patterns'],
		flows: ['flow', 'flows']
	};
	/** Desktop layout width a card's preview is drawn at before scaling; widgets render at their natural size. */
	const WIDTH: Partial<Record<Facet, number>> = { apps: 1280, patterns: 1040, flows: 760 };

	const label = (i: ShowcaseItem) =>
		i.facet === 'widgets' ? (catTitle[i.category] ?? i.category) : i.facet === 'patterns' ? 'Page pattern' : i.category;
	const total = $derived(data.items.length);
</script>

<svelte:head>
	<title>Showcase · Ripple</title>
	<meta name="description" content="Every Ripple widget, page pattern, flow and example app, rendered live from its spec." />
</svelte:head>

<div class="page" data-pagefind-body data-pagefind-meta="title:Showcase">
	<header class="head">
		<h1>Showcase</h1>
		<p>
			{total} examples, each rendered live from its spec: {totals.apps} apps, {totals.widgets} widgets, {totals.patterns} page
			patterns and {totals.flows} flows.
		</p>
	</header>

	<section class="spot" aria-labelledby="spot-title">
		<div class="site-frame spot-render" data-pagefind-ignore="all">
			<Ripple spec={data.spotlight.spec} />
		</div>
		<div class="spot-copy">
			<h2 id="spot-title">{data.spotlight.title}</h2>
			<p>{data.spotlight.line}</p>
			<p>
				One spec, no host code: the search box, the status filter, the detail pane and every button are bound to state in
				the JSON. Every control in the render works.
			</p>
			<div class="spot-links">
				<a href="/showcase/flows/{data.spotlight.id}">Open full size</a>
				{#if spotlightPlayground}<a href={spotlightPlayground}>Open in Playground</a>{/if}
			</div>
		</div>
	</section>

	<div class="controls">
		<div class="facets" role="group" aria-label="Show">
			{#each FACETS as f (f.id)}
				<button type="button" class="chip" aria-pressed={st.f === f.id} onclick={() => set({ f: f.id })}>
					{f.title}<span class="n">{counts[f.id]}</span>
				</button>
			{/each}
		</div>
		<input
			class="search"
			type="search"
			placeholder="Filter by name"
			aria-label="Filter examples by name"
			value={st.q}
			oninput={(e) => set({ q: e.currentTarget.value })}
		/>
	</div>

	{#if st.f === 'widgets' && cats.length}
		<div class="cats" role="group" aria-label="Widget category">
			<button type="button" class="chip small" aria-pressed={!st.c} onclick={() => set({ c: '' })}>
				All<span class="n">{counts.widgets}</span>
			</button>
			{#each cats as c (c.id)}
				<button type="button" class="chip small" aria-pressed={st.c === c.id} onclick={() => set({ c: c.id })}>
					{catTitle[c.id] ?? c.id}<span class="n">{c.count}</span>
				</button>
			{/each}
		</div>
	{/if}

	<p class="status" aria-live="polite">
		{#if shown.length}
			{shown.length}
			{NOUN[st.f][shown.length === 1 ? 0 : 1]}{st.c ? ` in ${catTitle[st.c] ?? st.c}` : ''}{st.q.trim() ? ` matching "${st.q.trim()}"` : ''}
		{:else}
			No {NOUN[st.f][1]} match "{st.q.trim()}".
			<button type="button" class="clear" onclick={() => set({ q: '', c: '' })}>Clear the filter</button>
		{/if}
	</p>

	<div class="grid">
		{#each shown as item (`${item.facet}:${item.id}`)}
			<ShowcaseCard
				{item}
				label={label(item)}
				spec={data.specs[`${item.facet}:${item.id}`]}
				app={item.facet === 'apps' ? item.id : undefined}
				width={WIDTH[item.facet]}
			/>
		{/each}
	</div>
</div>

<style>
	.page {
		container-type: inline-size;
		box-sizing: border-box;
		width: 100%;
		max-width: 1360px;
		margin: 0 auto;
		padding: 56px var(--site-gutter) 96px;
	}
	.head {
		max-width: 64ch;
	}
	h1 {
		margin: 0;
		font: 600 44px/1.05 var(--font-sans);
		letter-spacing: -0.03em;
		color: var(--site-ink);
	}
	.head p {
		margin: 14px 0 0;
		font: 400 18px/1.55 var(--font-sans);
		color: var(--site-soft);
		text-wrap: pretty;
	}

	.spot {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 24px;
		margin: 48px 0 72px;
	}
	.spot-render {
		min-width: 0;
		max-height: 640px;
		overflow: auto;
	}
	.spot-copy h2 {
		margin: 0;
		font: 600 24px/1.2 var(--font-sans);
		letter-spacing: -0.02em;
		color: var(--site-ink);
	}
	.spot-copy p {
		margin: 12px 0 0;
		font: 400 16px/1.6 var(--font-sans);
		color: var(--site-soft);
		max-width: 44ch;
	}
	.spot-links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 20px;
		margin-top: 20px;
	}
	.spot-links a {
		font: 500 15px/1.4 var(--font-sans);
		color: var(--primary-ink);
		text-decoration: none;
	}
	.spot-links a:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	@container (min-width: 900px) {
		.spot {
			grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
			align-items: start;
			gap: 40px;
		}
		.spot-copy {
			padding-top: 8px;
		}
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 24px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--site-line);
	}
	.facets,
	.cats {
		display: flex;
		gap: 6px;
		min-width: 0;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.facets::-webkit-scrollbar,
	.cats::-webkit-scrollbar {
		display: none;
	}
	.chip {
		flex: none;
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
		font: 500 15px/1 var(--font-sans);
		padding: 10px 14px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-soft);
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s,
			border-color 0.15s;
	}
	.chip.small {
		font-size: 13px;
		padding: 7px 10px;
	}
	.chip:hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	.chip[aria-pressed='true'] {
		color: var(--site-ink);
		background: var(--site-pressed);
		border-color: transparent;
	}
	.chip:focus-visible,
	.search:focus-visible,
	.clear:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.n {
		font-size: 0.85em;
		font-variant-numeric: tabular-nums;
		color: var(--site-soft);
	}
	.search {
		margin-left: auto;
		width: 260px;
		box-sizing: border-box;
		font: 400 15px/1 var(--font-sans);
		padding: 10px 12px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-ink);
	}
	.search::placeholder {
		color: var(--site-soft);
	}
	.cats {
		margin-top: 16px;
	}
	.status {
		margin: 20px 0;
		font: 400 14px/1.5 var(--font-sans);
		color: var(--site-soft);
	}
	.clear {
		margin-left: 8px;
		font: inherit;
		padding: 0;
		border: 0;
		background: none;
		color: var(--primary-ink);
		cursor: pointer;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
		gap: 40px 24px;
	}

	@media (max-width: 639.98px) {
		.page {
			padding-top: 32px;
			padding-bottom: 56px;
		}
		h1 {
			font-size: 34px;
		}
		.head p {
			font-size: 16px;
		}
		.spot {
			margin: 32px 0 48px;
		}
		.spot-render {
			max-height: 520px;
		}
		.controls {
			flex-direction: column;
			align-items: stretch;
		}
		.search {
			margin-left: 0;
			width: 100%;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.chip {
			transition: none;
		}
	}
</style>
