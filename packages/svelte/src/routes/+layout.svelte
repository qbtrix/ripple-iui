<!--
  @file routes/+layout.svelte
  @description The site chrome every route shares, following Paw OS's TopBar
    (paw-enterprise components/os/TopBar.svelte, PlanBadge.svelte and the
    .liquid-glass pill in routes/+layout.svelte). One sticky strip: the Ripple
    mark on the left; a centred icon nav (Chat, Gallery, Docs, Design system)
    where every item is an icon with an aria-label and a tooltip and the
    current one is PE's liquid-glass pill carrying its icon and label; on the
    right the docs search as a ⌘K chip, the GitHub and theme icon buttons, and a
    blue "Try Paw OS" pill in PlanBadge's paid style. The strip is PE's frosted
    shade over the warm ground with its faint cool tint, mirrored in light.
    Below 640px the nav sits between the mark and the tools, GitHub and Try Paw
    OS leave the bar (the footer carries both), and on small phones a long
    active label (Design system) shows its short form so 375px never scrolls sideways.
    A skip link (first focus) jumps to #main, the wrapper around every page.
    Glass falls back to solid under prefers-reduced-transparency. Tokens and
    fonts come from ./site.css. Theme: static/theme-init.js sets `dark` on
    <html> before paint; this reads and flips that class and remembers it.
    Labs and dev routes stay reachable by URL, unlinked. The bar says "Try Paw
    OS" (the pill's accessible name carries "by PocketPaw"), and the footer
    links "Paw OS by PocketPaw".
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Palette from '@lucide/svelte/icons/palette';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import '$lib/styles.css';
	import './site.css';
	import Search from '$lib/site/docs/Search.svelte';
	import { pawosBase } from './pawbar/session.svelte.js';

	let { children } = $props();

	const GITHUB_URL = 'https://github.com/qbtrix/ripple-iui';
	const NPM_URL = 'https://www.npmjs.com/package/@ripple-ui/svelte';
	const PAWOS_TRY = `${pawosBase(import.meta.env.PUBLIC_PAWOS_URL ?? '')}/?ref=ripple`;
	// `short` is the active pill's label on phones; null means icon only there.
	const nav = [
		{ href: '/', label: 'Chat', short: 'Chat', icon: MessageSquare },
		{ href: '/live', label: 'Gallery', short: 'Gallery', icon: LayoutGrid },
		{ href: '/docs', label: 'Docs', short: 'Docs', icon: BookOpen },
		{ href: '/ds', label: 'Design system', short: 'DS', icon: Palette }
	];
	// '/' would prefix-match every page, so Chat is current only on the landing.
	const current = (href: string) => (href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href));

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
	<a class="skip" href="#main">Skip to content</a>
	<header class="topbar">
		<div class="bar">
			<a href="/" class="brand" aria-label="Ripple home">
				<span class="mark" aria-hidden="true"></span>
				<span class="wordmark">Ripple</span>
			</a>
			<nav class="tabs" aria-label="Site">
				{#each nav as item (item.href)}
					{@const on = current(item.href)}
					<a
						href={item.href}
						class="tab"
						class:active={on}
						class:liquid-glass={on}
						class:no-short={on && !item.short}
						aria-label={item.label}
						aria-current={on ? 'page' : undefined}
						data-tip={on ? undefined : item.label}
					>
						<item.icon size={14} strokeWidth={2} aria-hidden="true" />
						{#if on}<span class="label" aria-hidden="true"
								><span class="long">{item.label}</span>{#if item.short}<span class="short">{item.short}</span>{/if}</span
							>{/if}
					</a>
				{/each}
			</nav>
			<div class="tools">
				<Search />
				<a href={GITHUB_URL} class="util wide" aria-label="GitHub" data-tip="GitHub">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
						><path
							d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"
						/></svg
					>
				</a>
				<button
					class="util"
					type="button"
					onclick={toggleTheme}
					aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
					data-tip={dark ? 'Light theme' : 'Dark theme'}
				>
					{#if dark}<Sun size={14} strokeWidth={2} aria-hidden="true" />{:else}<Moon size={14} strokeWidth={2} aria-hidden="true" />{/if}
				</button>
				<a href={PAWOS_TRY} class="try wide" aria-label="Try Paw OS by PocketPaw">Try Paw OS</a>
			</div>
		</div>
	</header>

	<div id="main" class="main" tabindex="-1">{@render children()}</div>

	<footer class="foot">
		<p>
			<span>MIT</span><span aria-hidden="true">·</span><a href={NPM_URL}>npm</a><span aria-hidden="true">·</span><a
				href={GITHUB_URL}>GitHub</a
			><span aria-hidden="true">·</span><a href="/playground">Playground</a><span aria-hidden="true">·</span><a href={PAWOS_TRY}
				>Paw OS by PocketPaw</a
			>
		</p>
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
		z-index: calc(var(--z-sticky) + 1);
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

	/* The strip. PE's header is transparent over its wallpaper; what reads as
	   its frosted gradient is the shell's top shade (rgba(0,0,0,.35) fading to
	   .05) over the cool navy fallback (#1a2030). Here that shade sits on the
	   warm ground mixed with a faint share of the navy, blurred like PE's glass
	   (8px, saturate 150%). Light mirrors it: a white shade on the off-white
	   ground with the same cool share. */
	.topbar {
		--bar-shade: linear-gradient(to bottom, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.05));
		--bar-tint: color-mix(in srgb, color-mix(in srgb, #262621 84%, #1a2030) 88%, transparent);
		position: sticky;
		top: env(safe-area-inset-top, 0px);
		z-index: var(--z-sticky);
		background: var(--bar-shade), var(--bar-tint);
		backdrop-filter: blur(8px) saturate(150%);
		-webkit-backdrop-filter: blur(8px) saturate(150%);
		border-bottom: 1px solid var(--site-line);
	}
	:global(html:not(.dark)) .topbar {
		--bar-shade: linear-gradient(to bottom, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.1));
		--bar-tint: color-mix(in srgb, color-mix(in srgb, #f7f6f2 90%, #c9d4e6) 86%, transparent);
	}
	@media (prefers-reduced-transparency: reduce) {
		.topbar {
			background: var(--site-ground);
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
		}
	}
	/* PE's bar: 8px top pad + a 38px content row, 12px sides; the nav is
	   absolutely centred over a left and a right cluster that share the rest. */
	.bar {
		position: relative;
		box-sizing: border-box;
		height: var(--site-topbar);
		padding: 8px 12px 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 6px;
		color: var(--site-ink);
		text-decoration: none;
		border-radius: var(--radius-control);
		transition: background 0.15s ease;
	}
	.brand:hover {
		background: var(--site-hover);
	}
	.mark {
		width: 18px;
		height: 20px;
		background: currentColor;
		-webkit-mask: url('/paw-logo/paw-mark.svg') center / contain no-repeat;
		mask: url('/paw-logo/paw-mark.svg') center / contain no-repeat;
	}
	.wordmark {
		font-family: var(--font-display);
		font-weight: 650;
		font-size: 17px;
		letter-spacing: -0.02em;
	}

	/* Centre nav: PE's .tab-btn. Icon-only items at 4px 8px, the active one
	   at 4px 14px with its label, all fully round, muted ink until hover. */
	.tabs {
		position: absolute;
		left: 50%;
		top: calc(50% + 4px);
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.tab {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 30px;
		box-sizing: border-box;
		padding: 4px 8px;
		border: 1px solid transparent;
		border-radius: 100px;
		color: var(--site-soft);
		font-size: 13px;
		font-weight: 400;
		text-decoration: none;
		white-space: nowrap;
		transition:
			color 0.2s ease,
			background 0.2s ease,
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}
	.tab:hover {
		color: var(--site-ink);
	}
	.tab.active {
		padding: 4px 14px;
		color: var(--site-ink);
		font-weight: 500;
	}
	.short {
		display: none;
	}
	/* PE's .liquid-glass: #000 at 38% (light: the composer's white glass), the
	   six-layer bevel, a 12% hairline, blur 8px saturate 150%. */
	.liquid-glass {
		background-color: var(--composer-glass);
		backdrop-filter: blur(8px) saturate(150%);
		-webkit-backdrop-filter: blur(8px) saturate(150%);
		border-color: var(--composer-line);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, #fff 10%, transparent),
			inset 2px 1px 0 -1px color-mix(in srgb, #fff 30%, transparent),
			inset -1.5px -1px 0 -1px color-mix(in srgb, #fff 20%, transparent),
			inset -2px -6px 1px -5px color-mix(in srgb, #fff 40%, transparent),
			inset -1px 2px 3px -1px color-mix(in srgb, #000 20%, transparent),
			0 3px 10px 0 color-mix(in srgb, #000 12%, transparent);
	}
	:global(html:not(.dark)) .liquid-glass {
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, #fff 60%, transparent),
			inset 2px 1px 0 -1px #fff,
			inset -1px 2px 3px -1px color-mix(in srgb, #000 6%, transparent),
			0 3px 10px 0 color-mix(in srgb, #000 8%, transparent);
	}

	/* Right cluster: 28px round utility buttons on --input with a hairline and
	   12px blur (PE's collab/bell buttons), then the plan-badge pill. */
	.tools {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.util {
		position: relative;
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 1px solid var(--site-line);
		border-radius: 50%;
		background: var(--site-hover);
		color: var(--site-soft);
		cursor: pointer;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		transition:
			color 0.15s ease,
			background 0.15s ease,
			border-color 0.15s ease;
	}
	.util:hover {
		color: var(--site-ink);
		background: var(--site-pressed);
		border-color: var(--site-faint);
	}
	/* PlanBadge's paid pill: 24px, 0 9px, fully round, 12px/500, a blue-subtle
	   wash with a 35% blue hairline and blue-lifted text. */
	.try {
		display: inline-flex;
		align-items: center;
		height: 24px;
		padding: 0 9px;
		border: 1px solid color-mix(in oklab, var(--primary) 35%, transparent);
		border-radius: 100px;
		background: color-mix(in oklab, var(--primary) 15%, transparent);
		color: var(--primary-ink);
		font-size: 12px;
		font-weight: 500;
		line-height: 1;
		white-space: nowrap;
		text-decoration: none;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		transition:
			color 0.15s ease,
			background 0.15s ease,
			border-color 0.15s ease;
	}
	.try:hover {
		background: color-mix(in oklab, var(--primary) 22%, transparent);
		border-color: color-mix(in oklab, var(--primary) 50%, transparent);
	}
	.try:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary) 55%, transparent);
	}
	.tab:focus-visible,
	.util:focus-visible,
	.brand:focus-visible,
	.foot a:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	/* Tooltips: a small popover-surface label under the control, on hover and
	   on keyboard focus (PE uses its Tooltip primitive, side bottom, offset 6). */
	.topbar :global([data-tip]::after) {
		content: attr(data-tip);
		position: absolute;
		top: calc(100% + 6px);
		left: 50%;
		transform: translate(-50%, -2px);
		padding: 5px 8px;
		border: 1px solid var(--site-line);
		border-radius: 6px;
		background: var(--popover, var(--site-panel));
		color: var(--site-ink);
		font: 500 12px/1.2 var(--font-sans);
		white-space: nowrap;
		pointer-events: none;
		opacity: 0;
		transition:
			opacity 0.12s ease,
			transform 0.12s ease;
		z-index: 1;
	}
	.topbar :global([data-tip]:hover::after),
	.topbar :global([data-tip]:focus-visible::after) {
		opacity: 1;
		transform: translate(-50%, 0);
		transition-delay: 0.25s;
	}
	@media (hover: none) {
		.topbar :global([data-tip]::after) {
			display: none;
		}
	}

	.foot {
		margin-top: auto;
		padding: 24px 0 32px;
		border-top: 1px solid var(--site-line);
		font-size: 14px;
		color: var(--site-soft);
	}
	.foot p {
		box-sizing: border-box;
		max-width: var(--site-max);
		margin: 0 auto;
		padding-inline: var(--site-gutter);
		display: flex;
		flex-wrap: wrap;
		gap: 4px 10px;
	}
	.foot a {
		color: inherit;
		text-underline-offset: 3px;
		border-radius: 4px;
	}
	.foot a:hover {
		color: var(--site-ink);
	}

	/* PE at <=768px: 20px nav icons, 15px labels, 32px utility buttons. */
	@media (max-width: 768px) {
		.tab :global(svg) {
			width: 20px;
			height: 20px;
		}
		.tab {
			min-height: 40px;
			font-size: 15px;
		}
		.util {
			width: 32px;
			height: 32px;
		}
	}
	/* Phones: the nav flows between the mark and the tools; GitHub and Try
	   Paw OS move to the footer, the wordmark goes (PE hides its logo text). */
	@media (max-width: 639.98px) {
		.bar {
			gap: 6px;
		}
		.wordmark,
		.wide {
			display: none;
		}
		.tabs {
			position: static;
			transform: none;
			gap: 0;
			flex: 1;
			justify-content: center;
			min-width: 0;
		}
		.tab {
			padding: 4px 8px;
		}
		.tab.active {
			padding: 4px 10px;
		}
		.tools {
			gap: 6px;
		}
		.long {
			display: none;
		}
		.short {
			display: inline;
		}
		.no-short .label {
			display: none;
		}
	}
</style>
