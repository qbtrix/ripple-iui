<!--
  @file routes/docs/widgets/+page.svelte
  @description The widget reference index: every manifest category in reading
    order with its count, shown as a card grid (a small live render, the type and
    its one-line description) or as the compact text list. The choice is a
    Grid | List toggle remembered in localStorage; the server always renders the
    grid's text, so search and no-JS readers get every type and description.
    Live renders are lazy: the widget bundle (MiniRender) and the example specs
    (examples.json) load when the first card nears the viewport, and a card's
    render mounts only while it is near the viewport, so the page never holds
    all 189 at once.
-->
<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { inView } from '$lib/site/docs/in-view.js';

	let { data } = $props();
	const total = $derived(data.categories.reduce((n, c) => n + c.widgets.length, 0));

	const STORE = 'ripple-docs-widgets-view';
	let view = $state<'grid' | 'list'>('grid');

	onMount(() => {
		try {
			if (localStorage.getItem(STORE) === 'list') view = 'list';
		} catch {
			// Storage blocked: keep the grid.
		}
	});

	function setView(v: 'grid' | 'list') {
		view = v;
		try {
			localStorage.setItem(STORE, v);
		} catch {
			// Storage blocked: the choice lasts for this visit.
		}
	}

	type Spec = Record<string, unknown>;
	let Mini = $state.raw<Component<{ spec: Spec }> | null>(null);
	let specs = $state.raw<Record<string, Spec> | null>(null);
	let loading: Promise<void> | null = null;
	const near = new SvelteSet<string>();

	function load() {
		loading ??= Promise.all([
			import('$lib/site/docs/MiniRender.svelte'),
			fetch('/docs/widgets/examples.json').then((r) => (r.ok ? (r.json() as Promise<Record<string, Spec>>) : Promise.reject(new Error(String(r.status)))))
		])
			.then(([m, s]) => {
				Mini = m.default;
				specs = s;
			})
			.catch(() => {
				// Cards keep their text; the next card into view tries again.
				loading = null;
			});
	}

	const watch = (type: string) =>
		inView((visible) => {
			if (visible) {
				near.add(type);
				load();
			} else near.delete(type);
		});
</script>

<svelte:head>
	<title>Widgets · Ripple docs</title>
	<meta name="description" content="Every Ripple widget type by category, with props, events and a live example." />
</svelte:head>

<article class="doc" data-pagefind-body>
	<h1>Widgets</h1>
	<p class="lede">
		{total} widget types by category. Each page shows a live example, the spec behind it, and the props the widget
		takes. Generated from the widget manifest.
	</p>

	<div class="seg" role="group" aria-label="Layout" data-pagefind-ignore>
		<button type="button" aria-pressed={view === 'grid'} onclick={() => setView('grid')}>Grid</button>
		<button type="button" aria-pressed={view === 'list'} onclick={() => setView('list')}>List</button>
	</div>

	{#each data.categories as c (c.id)}
		<section aria-labelledby={c.id}>
			<h2 id={c.id}>{c.title} <span class="count">{c.widgets.length}</span></h2>
			{#if view === 'grid'}
				<ul class="grid">
					{#each c.widgets as w (w.type)}
						{@const spec = specs?.[w.type]}
						<li class="card">
							<div class="stage" aria-hidden="true" inert data-pagefind-ignore="all" {@attach watch(w.type)}>
								{#if Mini && spec && near.has(w.type)}<Mini {spec} />{/if}
							</div>
							<a href="/docs/widgets/{w.type}"><code>{w.type}</code></a>
							<p>{w.description}</p>
						</li>
					{/each}
				</ul>
			{:else}
				<ul class="list">
					{#each c.widgets as w (w.type)}
						<li>
							<a href="/docs/widgets/{w.type}"><code>{w.type}</code></a>
							<span class="desc">{w.description}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/each}
</article>

<style>
	.doc {
		min-width: 0;
		font-size: 16px;
		line-height: 1.6;
	}
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 650;
		line-height: 1.15;
		letter-spacing: -0.02em;
	}
	.lede {
		margin: 10px 0 0;
		max-width: 70ch;
		font-size: 17px;
		color: var(--site-soft);
	}
	.seg {
		display: inline-flex;
		margin-top: 20px;
		padding: 2px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
	}
	.seg button {
		padding: 7px 12px;
		border: 0;
		border-radius: calc(var(--radius-control) - 2px);
		background: transparent;
		color: var(--site-soft);
		font: 500 13px/1 var(--font-sans);
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.seg button:hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	.seg button[aria-pressed='true'] {
		color: var(--site-ink);
		background: var(--site-pressed);
	}
	h2 {
		margin: 44px 0 12px;
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 650;
		line-height: 1.25;
		scroll-margin-top: calc(var(--site-topbar) + 24px);
	}
	.count {
		margin-left: 6px;
		font-family: var(--font-sans);
		font-size: 15px;
		font-weight: 400;
		color: var(--site-soft);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	a {
		color: var(--primary-ink);
		text-underline-offset: 3px;
		overflow-wrap: anywhere;
	}
	:is(a, button):focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	code {
		font: 0.93em var(--font-mono);
		font-variant-ligatures: none;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 184px), 1fr));
		gap: 12px;
	}
	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 8px 8px 12px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		transition: background 0.15s;
	}
	.card:hover {
		background: var(--site-hover);
	}
	.stage {
		display: flex;
		flex-direction: column;
		justify-content: safe center;
		height: 128px;
		margin-bottom: 10px;
		padding: 12px;
		overflow: hidden;
		border-radius: calc(var(--radius-card) - 4px);
		background: var(--card);
		pointer-events: none;
	}
	.card a {
		align-self: flex-start;
		padding: 0 4px;
		color: var(--site-ink);
		font-weight: 600;
		text-decoration: none;
	}
	/* The whole card is the link's hit area; the stage is inert so nothing in it competes. */
	.card a::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}
	.card a:focus-visible {
		outline: 0;
	}
	.card:has(a:focus-visible) {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.card p {
		display: -webkit-box;
		margin: 2px 0 0;
		padding: 0 4px;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		font-size: 13.5px;
		line-height: 1.45;
		color: var(--site-soft);
	}

	.list {
		border-top: 1px solid var(--site-line);
	}
	.list li {
		display: grid;
		grid-template-columns: minmax(0, 200px) minmax(0, 1fr);
		gap: 16px;
		padding: 8px 0;
		border-bottom: 1px solid var(--site-line);
		font-size: 15px;
	}
	.list a {
		align-self: start;
	}
	.desc {
		color: var(--site-soft);
	}
	@media (max-width: 559.98px) {
		.list li {
			grid-template-columns: minmax(0, 1fr);
			gap: 2px;
		}
	}
</style>
