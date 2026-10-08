<!--
  @file routes/+layout.svelte
  @description Site chrome in the Paw OS look: a frosted sticky top bar (Paw
    mark + "Ripple" wordmark, Live / Showcase / Playground / GitHub, theme
    toggle) and the footer line. Tokens and fonts come from ./site.css. Dark
    is the default: app.html puts `dark` on <html> before paint (and drops it
    when the visitor chose light), so this only reads and flips that class and
    remembers the choice. Labs and dev routes stay reachable by URL, unlinked.
    The top bar never says "Paw OS": the first mention on a page must read
    "Paw OS by PocketPaw", which the page or the footer carries.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import '$lib/styles.css';
	import './site.css';

	let { children } = $props();

	const GITHUB_URL = 'https://github.com/qbtrix/ripple-iui';
	const nav = [
		{ href: '/live', label: 'Live' },
		{ href: '/showcase', label: 'Showcase' },
		{ href: '/playground', label: 'Playground' }
	];

	let dark = $state(true);
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

<svelte:head>
	<link rel="icon" href="/paw-logo/favicon.svg" type="image/svg+xml" />
	<title>Ripple</title>
</svelte:head>

<div class="shell">
	<header class="topbar">
		<a href="/" class="brand" aria-label="Ripple home">
			<span class="mark" aria-hidden="true"></span>
			<span class="wordmark">Ripple</span>
		</a>
		<nav class="links" aria-label="Site">
			{#each nav as item (item.href)}
				<a href={item.href} class="link" aria-current={page.url.pathname.startsWith(item.href) ? 'page' : undefined}>
					{item.label}
				</a>
			{/each}
			<a href={GITHUB_URL} class="link gh" aria-label="GitHub">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
					><path
						d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"
					/></svg
				>
				<span class="gh-label">GitHub</span>
			</a>
			<button class="theme" type="button" onclick={toggleTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
				{#if dark}
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"
						><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg
					>
				{:else}
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"
						><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg
					>
				{/if}
			</button>
		</nav>
	</header>

	{@render children()}

	<footer class="foot">
		<p>Ripple is open source (MIT). Paw OS by PocketPaw.</p>
		<a href={GITHUB_URL}>github.com/qbtrix/ripple-iui</a>
	</footer>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
		scroll-padding-top: 72px;
	}
	.shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		overflow-x: clip;
	}
	.topbar {
		position: sticky;
		top: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px clamp(16px, 4vw, 32px);
		background: var(--glass);
		backdrop-filter: blur(12px) saturate(1.4);
		-webkit-backdrop-filter: blur(12px) saturate(1.4);
		border-bottom: 1px solid var(--glass-line);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 9px;
		color: var(--site-ink);
		text-decoration: none;
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
	.link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 11px;
		border-radius: 8px;
		font-size: 13.5px;
		font-weight: 500;
		color: var(--site-soft);
		text-decoration: none;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.link:hover,
	.link[aria-current='page'] {
		color: var(--site-ink);
		background: color-mix(in oklch, var(--site-ink) 8%, transparent);
	}
	.theme {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		margin-left: 6px;
		border: 1px solid var(--glass-line);
		border-radius: 8px;
		background: transparent;
		color: var(--site-soft);
		cursor: pointer;
	}
	.theme:hover {
		color: var(--site-ink);
	}
	.link:focus-visible,
	.theme:focus-visible,
	.brand:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}
	.foot {
		margin-top: auto;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px 24px;
		padding: 28px clamp(16px, 4vw, 32px) 36px;
		border-top: 1px solid var(--site-line);
		font-size: 13.5px;
		color: var(--site-soft);
	}
	.foot p {
		margin: 0;
	}
	.foot a {
		color: inherit;
		font-family: var(--font-mono);
		font-size: 12.5px;
	}
	@media (max-width: 560px) {
		.gh-label {
			display: none;
		}
		.link {
			padding: 6px 7px;
			font-size: 13px;
		}
		.theme {
			margin-left: 2px;
		}
	}
</style>
