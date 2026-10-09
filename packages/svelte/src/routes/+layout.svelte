<!--
  @file routes/+layout.svelte
  @description The site chrome every route shares. A 56px sticky top bar (Paw
    mark + "Ripple", the package version from package.json, Docs / Widgets /
    Live / Playground / Showcase, search, the GitHub link with its star count,
    the theme toggle) and a four-column footer (two columns below 640px). The
    star count is fetched once at build time in vite.config.ts and baked in as
    PUBLIC_GITHUB_STARS; it is empty when the fetch failed, so the page never
    asks GitHub for anything. Below 640px the nav links move into a disclosure
    menu; the logo, GitHub link and theme toggle stay in the bar. A skip link
    (first focus) jumps to #main, the wrapper around every page.
    #main carries the Pagefind `kind` filter (Docs / Widgets / Showcase) from
    the pathname; pages opt into the search index with data-pagefind-body.
    The bar is the only glass on the site, with a solid fallback under
    prefers-reduced-transparency, and sits one layer above page-level sticky
    bars. Tokens and fonts come from ./site.css. Theme: static/theme-init.js
    sets `dark` on <html> before paint (the stored choice, else the OS); this
    reads and flips that class and remembers the choice. Labs and dev routes
    stay reachable by URL, unlinked. The top bar never says "Paw OS": the first
    mention on a page must read "Paw OS by PocketPaw", which the page or the
    footer carries.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import '$lib/styles.css';
	import './site.css';
	import Search from '$lib/site/docs/Search.svelte';
	import { version } from '../../package.json';

	let { children } = $props();

	const GITHUB_URL = 'https://github.com/qbtrix/ripple-iui';
	const NPM_URL = 'https://www.npmjs.com/package/@ripple-ui/svelte';
	const STARS: string = import.meta.env.PUBLIC_GITHUB_STARS;
	const nav = [
		{ href: '/docs', label: 'Docs' },
		{ href: '/docs/widgets', label: 'Widgets' },
		{ href: '/live', label: 'Live' },
		{ href: '/playground', label: 'Playground' },
		{ href: '/showcase', label: 'Showcase' }
	];
	const footer = [
		{
			title: 'Product',
			links: [
				{ href: '/playground', label: 'Playground' },
				{ href: '/live', label: 'Live' },
				{ href: '/showcase', label: 'Showcase' }
			]
		},
		{
			title: 'Docs',
			links: [
				{ href: '/docs/getting-started/install', label: 'Getting started' },
				{ href: '/docs/widgets', label: 'Widgets' },
				{ href: '/docs/guides/custom-widgets', label: 'Guides' },
				{ href: '/docs/api/core', label: 'API' }
			]
		},
		{
			title: 'Resources',
			links: [
				{ href: '/llms.txt', label: 'llms.txt' },
				{ href: '/llms-full.txt', label: 'llms-full.txt' },
				{ href: '/manifest.json', label: 'manifest.json' },
				{ href: NPM_URL, label: 'npm' },
				{ href: GITHUB_URL, label: 'GitHub' }
			]
		},
		{
			title: 'Project',
			links: [{ href: `${GITHUB_URL}/blob/main/LICENSE`, label: 'MIT licence' }]
		}
	];

	// The longest nav href the path sits under, so /docs/widgets lights Widgets, not Docs.
	const current = $derived(
		nav
			.filter((n) => page.url.pathname === n.href || page.url.pathname.startsWith(`${n.href}/`))
			.reduce<string | undefined>((a, n) => (a && a.length >= n.href.length ? a : n.href), undefined)
	);
	const kind = $derived(
		page.url.pathname.startsWith('/docs/widgets')
			? 'Widgets'
			: page.url.pathname.startsWith('/docs')
				? 'Docs'
				: page.url.pathname.startsWith('/showcase')
					? 'Showcase'
					: undefined
	);

	let dark = $state(true);
	let menuOpen = $state(false);
	onMount(() => {
		dark = document.documentElement.classList.contains('dark');
	});

	function toggleTheme() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		try {
			localStorage.setItem('ripple-theme', dark ? 'dark' : 'light');
		} catch {
			/* storage blocked: the choice lasts this page view */
		}
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)} />

<svelte:head>
	<link rel="icon" href="/paw-logo/favicon.svg" type="image/svg+xml" />
	<title>Ripple</title>
</svelte:head>

{#snippet links()}
	{#each nav as item (item.href)}
		<a
			href={item.href}
			class="link"
			aria-current={current === item.href ? 'page' : undefined}
			onclick={() => (menuOpen = false)}>{item.label}</a
		>
	{/each}
{/snippet}

<div class="shell">
	<a class="skip" href="#main">Skip to content</a>
	<header class="topbar">
		<div class="bar">
			<div class="id">
				<a href="/" class="brand" aria-label="Ripple home">
					<span class="mark" aria-hidden="true"></span>
					<span class="wordmark">Ripple</span>
				</a>
				<a href={NPM_URL} class="version" aria-label="Version {version} on npm">v{version}</a>
			</div>
			<nav class="links" aria-label="Site">{@render links()}</nav>
			<div class="tools">
				<Search />
				<a href={GITHUB_URL} class="icon gh" aria-label={STARS ? `GitHub, ${STARS} stars` : 'GitHub'}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
						><path
							d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"
						/></svg
					>
					{#if STARS}<span class="stars" aria-hidden="true">{STARS}</span>{/if}
				</a>
				<button class="icon" type="button" onclick={toggleTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
					{#if dark}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"
							><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg
						>
					{:else}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"
							><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg
						>
					{/if}
				</button>
				<button
					class="icon menu-btn"
					type="button"
					aria-label="Menu"
					aria-expanded={menuOpen}
					aria-controls="site-menu"
					onclick={() => (menuOpen = !menuOpen)}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
						{#if menuOpen}<path d="M6 6l12 12M18 6 6 18" />{:else}<path d="M4 7h16M4 12h16M4 17h16" />{/if}
					</svg>
				</button>
			</div>
		</div>
		<nav id="site-menu" class="menu" aria-label="Site menu" hidden={!menuOpen}>{@render links()}</nav>
	</header>

	<div id="main" class="main" tabindex="-1" data-pagefind-filter={kind ? `kind:${kind}` : undefined}>
		{@render children()}
	</div>

	<footer class="foot">
		<div class="cols">
			{#each footer as col (col.title)}
				<nav aria-labelledby="foot-{col.title}">
					<h2 id="foot-{col.title}">{col.title}</h2>
					<ul>
						{#each col.links as l (l.href)}
							<li><a href={l.href}>{l.label}</a></li>
						{/each}
						{#if col.title === 'Project'}<li>Paw OS by PocketPaw</li>{/if}
					</ul>
				</nav>
			{/each}
		</div>
	</footer>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
		scroll-padding-top: calc(var(--site-topbar) + 16px);
	}
	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			scroll-behavior: auto;
		}
	}
	.shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		overflow-x: clip;
	}
	.main {
		flex: 1 0 auto;
		min-width: 0;
		outline: none;
	}
	/* Skip link: off screen until focused, then above the top bar. */
	.skip {
		position: absolute;
		top: 8px;
		left: 8px;
		z-index: calc(var(--z-sticky) + 2);
		padding: 10px 14px;
		border-radius: var(--radius-control);
		background: var(--site-ground);
		color: var(--site-ink);
		font-weight: 600;
		transform: translateY(-200%);
	}
	.skip:focus-visible {
		transform: none;
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	/* One above page-level sticky bars (the docs drawer row), so the open menu covers them. */
	.topbar {
		position: sticky;
		top: 0;
		z-index: calc(var(--z-sticky) + 1);
		background: var(--glass);
		backdrop-filter: blur(12px) saturate(1.4);
		-webkit-backdrop-filter: blur(12px) saturate(1.4);
		border-bottom: 1px solid var(--site-line);
	}
	@media (prefers-reduced-transparency: reduce) {
		.topbar {
			background: var(--site-ground);
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
		}
	}
	.bar,
	.cols {
		box-sizing: border-box;
		max-width: var(--site-max);
		margin-inline: auto;
		padding-inline: var(--site-gutter);
	}
	.bar {
		height: var(--site-topbar);
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.id {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.version {
		padding: 1px 6px;
		border: 1px solid var(--site-line);
		border-radius: 6px;
		font: 500 12px var(--font-mono);
		color: var(--site-soft);
		text-decoration: none;
		transition:
			color 0.15s,
			border-color 0.15s;
	}
	.version:hover {
		color: var(--site-ink);
		border-color: var(--site-faint);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 9px;
		color: var(--site-ink);
		text-decoration: none;
		border-radius: var(--radius-control);
	}
	.mark {
		width: 22px;
		height: 24px;
		background: currentColor;
		-webkit-mask: url('/paw-logo/paw-mark.svg') center / contain no-repeat;
		mask: url('/paw-logo/paw-mark.svg') center / contain no-repeat;
	}
	.wordmark {
		font-family: var(--font-display);
		font-weight: 650;
		font-size: 19px;
		letter-spacing: -0.02em;
	}
	.links {
		display: flex;
		align-items: center;
		gap: 2px;
	}
	.tools {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-left: auto;
	}
	.link {
		display: inline-flex;
		align-items: center;
		padding: 6px 11px;
		border-radius: var(--radius-control);
		font-size: 14px;
		font-weight: 500;
		color: var(--site-soft);
		text-decoration: none;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.link:hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	.link[aria-current='page'] {
		color: var(--site-ink);
		background: var(--site-pressed);
	}
	.icon {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		padding: 0;
		border: 0;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-soft);
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.icon:hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	.icon:active {
		background: var(--site-pressed);
	}
	.gh {
		display: inline-flex;
		gap: 6px;
		width: auto;
		min-width: 36px;
		padding-inline: 9px;
		text-decoration: none;
	}
	.stars {
		font: 500 13px var(--font-sans);
		font-variant-numeric: tabular-nums;
	}
	.menu-btn,
	.menu {
		display: none;
	}
	.link:focus-visible,
	.icon:focus-visible,
	.brand:focus-visible,
	.version:focus-visible,
	.foot a:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.foot {
		margin-top: auto;
		padding: 40px 0 48px;
		border-top: 1px solid var(--site-line);
		font-size: 14px;
		color: var(--site-soft);
	}
	.cols {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 32px 24px;
	}
	.foot h2 {
		margin: 0 0 12px;
		font: 600 13px var(--font-sans);
		color: var(--site-ink);
	}
	.foot ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 8px;
	}
	.foot a {
		color: inherit;
		text-decoration: none;
		text-underline-offset: 3px;
		border-radius: 4px;
	}
	.foot a:hover {
		color: var(--site-ink);
		text-decoration: underline;
	}
	@media (max-width: 639.98px) {
		.bar,
		.cols {
			padding-inline: 16px;
		}
		.cols {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.links {
			display: none;
		}
		.menu-btn {
			display: grid;
		}
		.menu:not([hidden]) {
			display: flex;
			flex-direction: column;
			gap: 2px;
			padding: 8px 12px 12px;
			border-top: 1px solid var(--site-line);
		}
		.menu .link {
			padding: 10px 12px;
			font-size: 15px;
		}
	}
</style>
