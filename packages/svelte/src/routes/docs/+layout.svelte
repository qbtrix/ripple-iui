<!--
  @file routes/docs/+layout.svelte
  @description The docs frame inside the site chrome: sidebar (240px), content
    (the page, max 760px) and an "On this page" rail (200px) built from the
    page's h2/h3. The rail hides below 1024px. Below 768px the sidebar moves
    into a drawer opened from a sub-bar; the drawer is a modal <dialog>, which
    gives focus containment, Escape to close and an inert page behind it (it
    lives in the top layer, so --z-drawer is set for consistency only).
-->
<script lang="ts">
	import { page } from '$app/state';

	let { data, children } = $props();

	let drawer: HTMLDialogElement | undefined = $state();
	const headings = $derived(
		(page.data.headings ?? []) as { id: string; text: string; depth: number }[]
	);
	const current = $derived(page.url.pathname.replace(/^\/docs\/?/, ''));
	// Set by a widget page's load: its category and that category's widget types.
	const widgetPage = $derived(
		page.data.siblings ? { category: page.data.category as { id: string }, siblings: page.data.siblings as string[] } : null
	);
	const currentTitle = $derived(
		data.nav.flatMap((s) => s.pages).find((p) => p.slug === current)?.title ??
			(current === 'widgets' ? 'Widgets' : (page.data.type as string | undefined)) ??
			'Docs'
	);
</script>

{#snippet navList()}
	{#each data.nav as section (section.title)}
		<p class="section">{section.title}</p>
		<ul>
			{#each section.pages as p (p.slug)}
				<li>
					<a
						href="/docs/{p.slug}"
						aria-current={p.slug === current ? 'page' : undefined}
						onclick={() => drawer?.close()}>{p.title}</a
					>
				</li>
			{/each}
		</ul>
	{/each}
	<p class="section">Widgets</p>
	<ul>
		<li>
			<a href="/docs/widgets" aria-current={current === 'widgets' ? 'page' : undefined} onclick={() => drawer?.close()}
				>All widgets</a
			>
		</li>
		{#each data.widgetNav as c (c.id)}
			<li>
				<a href="/docs/widgets#{c.id}" onclick={() => drawer?.close()}>{c.title}</a>
				{#if widgetPage?.category.id === c.id}
					<ul class="sub">
						{#each widgetPage.siblings as type (type)}
							<li>
								<a
									href="/docs/widgets/{type}"
									aria-current={current === `widgets/${type}` ? 'page' : undefined}
									onclick={() => drawer?.close()}><code>{type}</code></a
								>
							</li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<div class="subbar">
	<button type="button" class="drawer-btn" aria-haspopup="dialog" onclick={() => drawer?.showModal()}>
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"
			><path d="M4 7h16M4 12h16M4 17h16" /></svg
		>
		<span>Docs menu</span>
	</button>
	<span class="crumb" aria-hidden="true">{currentTitle}</span>
</div>

<dialog
	bind:this={drawer}
	class="drawer"
	aria-label="Docs"
	onclick={(e) => e.target === drawer && drawer.close()}
>
	<div class="drawer-head">
		<span class="drawer-title">Docs</span>
		<button type="button" class="close" aria-label="Close docs menu" onclick={() => drawer?.close()}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"
				><path d="M6 6l12 12M18 6 6 18" /></svg
			>
		</button>
	</div>
	<nav aria-label="Docs">{@render navList()}</nav>
</dialog>

<div class="docs">
	<aside class="sidebar">
		<nav aria-label="Docs">{@render navList()}</nav>
	</aside>
	<div class="main">{@render children()}</div>
	<aside class="rail">
		{#if headings.length}
			<p class="section">On this page</p>
			<ul>
				{#each headings as h (h.id)}
					<li class={{ sub: h.depth === 3 }}><a href="#{h.id}">{h.text}</a></li>
				{/each}
			</ul>
		{/if}
	</aside>
</div>

<style>
	.docs {
		box-sizing: border-box;
		width: 100%;
		max-width: var(--site-max);
		margin-inline: auto;
		padding: 40px var(--site-gutter) 64px;
		display: grid;
		grid-template-columns: 240px minmax(0, 760px) 200px;
		justify-content: space-between;
		gap: 40px;
	}
	.sidebar,
	.rail {
		position: sticky;
		top: calc(var(--site-topbar) + 40px);
		align-self: start;
		max-height: calc(100vh - var(--site-topbar) - 64px);
		overflow-y: auto;
	}
	.section {
		margin: 0 0 8px;
		font-size: 13px;
		font-weight: 600;
		color: var(--site-ink);
	}
	ul {
		list-style: none;
		margin: 0 0 24px;
		padding: 0;
	}
	nav a,
	.rail a {
		display: block;
		padding: 6px 10px;
		border-radius: var(--radius-control);
		font-size: 14px;
		line-height: 1.4;
		color: var(--site-soft);
		text-decoration: none;
		transition:
			color 0.15s,
			background 0.15s;
	}
	nav a:hover,
	.rail a:hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	nav a[aria-current='page'] {
		color: var(--site-ink);
		background: var(--site-pressed);
		font-weight: 500;
	}
	ul.sub {
		margin: 2px 0 6px 10px;
		padding-left: 6px;
		border-left: 1px solid var(--site-line);
	}
	ul.sub code {
		font: 13px var(--font-mono);
		font-variant-ligatures: none;
		overflow-wrap: anywhere;
	}
	.rail a {
		font-size: 13px;
		padding: 4px 8px;
	}
	.rail .sub a {
		padding-left: 20px;
	}
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	.subbar {
		display: none;
	}
	.drawer {
		z-index: var(--z-drawer);
		box-sizing: border-box;
		margin: 0;
		width: min(300px, 85vw);
		height: 100dvh;
		max-height: none;
		padding: 12px 16px 24px;
		border: 0;
		border-right: 1px solid var(--site-line);
		background: var(--site-ground);
		color: var(--site-ink);
	}
	.drawer::backdrop {
		background: color-mix(in oklch, var(--site-ink-base) 30%, transparent);
	}
	.drawer[open] {
		animation: slide-in var(--dur-mount) var(--ease-out-quart);
	}
	@keyframes slide-in {
		from {
			transform: translateX(-16px);
			opacity: 0;
		}
	}
	.drawer-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}
	.drawer-title {
		font-weight: 600;
	}
	.close,
	.drawer-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 36px;
		padding: 0 10px;
		border: 0;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-soft);
		font: 500 14px var(--font-sans);
		cursor: pointer;
	}
	.close:hover,
	.drawer-btn:hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}

	@media (max-width: 1023.98px) {
		.docs {
			grid-template-columns: 220px minmax(0, 1fr);
		}
		.rail {
			display: none;
		}
	}
	@media (max-width: 767.98px) {
		.subbar {
			position: sticky;
			top: var(--site-topbar);
			z-index: var(--z-sticky);
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 6px 8px;
			border-bottom: 1px solid var(--site-line);
			background: var(--site-ground);
		}
		.crumb {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-size: 14px;
			color: var(--site-soft);
		}
		.docs {
			display: block;
			padding: 24px 16px 48px;
		}
		.sidebar {
			display: none;
		}
	}
</style>
