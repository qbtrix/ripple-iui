<!--
  @file routes/docs/widgets/+page.svelte
  @description The widget reference index: every manifest category in reading
    order with its count, each a compact list of type (mono) and one-line
    description. Plain lists, no live renders, so this page ships no widget JS.
-->
<script lang="ts">
	let { data } = $props();
	const total = $derived(data.categories.reduce((n, c) => n + c.widgets.length, 0));
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

	{#each data.categories as c (c.id)}
		<section aria-labelledby={c.id}>
			<h2 id={c.id}>{c.title} <span class="count">{c.widgets.length}</span></h2>
			<ul>
				{#each c.widgets as w (w.type)}
					<li>
						<a href="/docs/widgets/{w.type}"><code>{w.type}</code></a>
						<span class="desc">{w.description}</span>
					</li>
				{/each}
			</ul>
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
	h2 {
		margin: 44px 0 8px;
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
		border-top: 1px solid var(--site-line);
	}
	li {
		display: grid;
		grid-template-columns: minmax(0, 200px) minmax(0, 1fr);
		gap: 16px;
		padding: 8px 0;
		border-bottom: 1px solid var(--site-line);
		font-size: 15px;
	}
	a {
		align-self: start;
		color: var(--primary-ink);
		text-underline-offset: 3px;
		overflow-wrap: anywhere;
	}
	a:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	code {
		font: 0.93em var(--font-mono);
		font-variant-ligatures: none;
	}
	.desc {
		color: var(--site-soft);
	}
	@media (max-width: 559.98px) {
		li {
			grid-template-columns: minmax(0, 1fr);
			gap: 2px;
		}
	}
</style>
