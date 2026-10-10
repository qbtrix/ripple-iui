<!--
  @file routes/docs/widgets/[type]/+page.svelte
  @description One generated widget reference page: type, category, description,
    the manifest example live in a SpecExample (or its first pocket when the
    bare example renders nothing, see EMPTY_EXAMPLES), any other pockets, then Props / Events / Node fields tables, each only when it has
    rows. All copy comes from the manifest entry. Tables scroll inside their own
    box so a phone never scrolls sideways. Indexed by Pagefind (data-pagefind-body).
-->
<script lang="ts">
	import SpecExample from '$lib/site/SpecExample.svelte';

	let { data } = $props();

	let copied = $state(false);

	async function copySpec() {
		await navigator.clipboard.writeText(JSON.stringify(data.example, null, 2));
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<svelte:head>
	<title>{data.type} widget · Ripple docs</title>
	<meta name="description" content={data.description} />
</svelte:head>

{#snippet table(id: string, title: string, list: typeof data.props)}
	{#if list.length}
		<h2 {id}>{title}</h2>
		<div class="table-wrap">
			<table>
				<thead>
					<tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr>
				</thead>
				<tbody>
					{#each list as row (row.name)}
						<tr>
							<td><code>{row.name}</code></td>
							<td><code class="type">{row.type}</code></td>
							<td>{row.required ? 'Yes' : 'No'}</td>
							<td>{row.description}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{/snippet}

<article class="doc" data-pagefind-body>
	<header class="head">
		<p class="crumbs">
			<a href="/docs/widgets">Widgets</a> / <a href="/docs/widgets#{data.category.id}">{data.category.title}</a>
		</p>
		<h1>{data.type}</h1>
		<p class="lede">{data.description}</p>
		{#if data.staticSafe}
			<p class="badge">Renders without JS</p>
		{/if}
		<div class="actions" data-pagefind-ignore>
			<button type="button" onclick={copySpec}>{copied ? 'Copied' : 'Copy spec'}</button>
			<a href="/docs/widgets/{data.type}.md">View as Markdown</a>
			<a href={data.source} rel="noopener">Source on GitHub</a>
		</div>
		<span class="sr-only" aria-live="polite">{copied ? 'Spec copied' : ''}</span>
	</header>

	<h2 id="example">Example</h2>
	<SpecExample spec={data.example} />

	{#each data.interactive as s, i (s.name)}
		<h2 id="interactive-{i}">{s.name}</h2>
		{#if s.description}<p>{s.description}</p>{/if}
		<SpecExample spec={s.spec} />
	{/each}

	{@render table('props', 'Props', data.props)}
	{@render table('events', 'Events', data.events)}
	{@render table('node-fields', 'Node fields', data.nodeFields)}

	{#if data.prev || data.next}
		<nav class="pager" aria-label="Previous and next {data.category.title} widget" data-pagefind-ignore>
			{#if data.prev}
				<a class="prev" href="/docs/widgets/{data.prev}"><span>Previous</span><code>{data.prev}</code></a>
			{/if}
			{#if data.next}
				<a class="next" href="/docs/widgets/{data.next}"><span>Next</span><code>{data.next}</code></a>
			{/if}
		</nav>
	{/if}
</article>

<style>
	.doc {
		min-width: 0;
		font-size: 16px;
		line-height: 1.6;
	}
	.crumbs {
		margin: 0 0 8px;
		font-size: 14px;
		color: var(--site-soft);
	}
	.crumbs a {
		color: var(--site-soft);
		text-underline-offset: 3px;
	}
	.crumbs a:hover {
		color: var(--site-ink);
	}
	h1 {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 1.9rem;
		font-weight: 600;
		line-height: 1.2;
		letter-spacing: -0.01em;
		overflow-wrap: anywhere;
	}
	.lede {
		margin: 10px 0 0;
		max-width: 70ch;
		font-size: 17px;
		color: var(--site-soft);
		overflow-wrap: anywhere;
	}
	.badge {
		display: inline-block;
		margin: 14px 0 0;
		padding: 2px 9px;
		border: 1px solid var(--site-line);
		border-radius: 999px;
		font-size: 13px;
		color: var(--site-soft);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 18px;
		padding-bottom: 24px;
		border-bottom: 1px solid var(--site-line);
	}
	.actions button,
	.actions a {
		padding: 6px 11px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-soft);
		font: 500 13px/1.2 var(--font-sans);
		text-decoration: none;
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.actions button:hover,
	.actions a:hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	:is(a, button):focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	h2 {
		margin: 48px 0 12px;
		font-family: var(--font-display);
		font-size: 1.45rem;
		font-weight: 650;
		line-height: 1.25;
		letter-spacing: -0.01em;
	}
	.table-wrap {
		overflow-x: auto;
		margin: 16px 0;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 15px;
	}
	th,
	td {
		padding: 8px 12px;
		border-bottom: 1px solid var(--site-line);
		text-align: left;
		vertical-align: top;
	}
	th {
		font-weight: 600;
		white-space: nowrap;
	}
	td:last-child {
		min-width: 220px;
	}
	code {
		padding: 1px 5px;
		border: 1px solid var(--code-line);
		border-radius: 5px;
		background: var(--code-bg);
		font: 0.875em var(--font-mono);
		font-variant-ligatures: none;
	}
	/* Long union types wrap; a bordered box would break into ragged pieces. */
	code.type {
		padding: 0;
		border: 0;
		background: none;
		color: var(--site-soft);
	}
	td:nth-child(2) {
		min-width: 140px;
	}
	.pager {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		margin-top: 56px;
		padding-top: 24px;
		border-top: 1px solid var(--site-line);
	}
	.pager a {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
		padding: 10px 14px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		color: var(--site-ink);
		text-decoration: none;
		transition: background 0.15s;
	}
	.pager a:hover {
		background: var(--site-hover);
	}
	.pager span {
		font-size: 13px;
		color: var(--site-soft);
	}
	.next {
		margin-left: auto;
		align-items: flex-end !important;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
