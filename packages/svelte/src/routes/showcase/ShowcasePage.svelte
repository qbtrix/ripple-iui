<!--
  @file routes/showcase/ShowcasePage.svelte
  @description The shared frame every hand-built /showcase/<slug> page sits
    in: a breadcrumb, the h1 and one line from the APPS list in catalog.ts (so
    the page title, its index card and its search result agree), the search
    index opt-in, and the base styles for the .showcase-* section classes the
    older pages use. Inside an index card thumbnail (thumbContext set by
    ShowcaseCard) it renders the page body alone: no header, no index opt-in.
-->
<script lang="ts" module>
	import { createContext } from 'svelte';
	export const [isThumb, thumbContext] = createContext<boolean>();
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { APPS } from '$lib/site/showcase/catalog.js';

	let { slug, wide = false, children }: { slug: string; wide?: boolean; children: Snippet } = $props();

	const app = $derived(APPS.find((a) => a.slug === slug));
	// The getter throws outside a card; that just means a normal page.
	const thumb = (() => {
		try {
			return isThumb();
		} catch {
			return false;
		}
	})();
</script>

{#if thumb}
	{@render children()}
{:else}
	<div class="sub" class:wide data-pagefind-body data-pagefind-meta="title:{app?.title ?? slug}">
		<header class="head">
			<nav class="crumbs" aria-label="Breadcrumb">
				<a href="/showcase">Showcase</a>
				<span aria-hidden="true">/</span>
				<span>Apps</span>
			</nav>
			<h1>{app?.title ?? slug}</h1>
			{#if app}<p>{app.line}</p>{/if}
		</header>
		{@render children()}
	</div>
{/if}

<style>
	.sub {
		box-sizing: border-box;
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 40px var(--site-gutter) 96px;
		color: var(--site-ink);
	}
	.sub.wide {
		max-width: 1440px;
	}
	.head {
		margin-bottom: 32px;
		max-width: 68ch;
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
	h1 {
		margin: 16px 0 0;
		font: 600 36px/1.1 var(--font-sans);
		letter-spacing: -0.025em;
	}
	.head p {
		margin: 12px 0 0;
		font: 400 17px/1.55 var(--font-sans);
		color: var(--site-soft);
	}
	@media (max-width: 639.98px) {
		.sub {
			padding-top: 24px;
			padding-bottom: 56px;
		}
		h1 {
			font-size: 28px;
		}
	}

	/* Base look for the .showcase-* classes the older section pages share. A
	   page's own scoped rules still win where it has them. */
	.sub :global {
		.showcase-header {
			margin-bottom: 32px;
		}
		.showcase-header p {
			margin: 0 0 16px;
			font: 400 15px/1.55 var(--font-sans);
			color: var(--site-soft);
		}
		.showcase-nav {
			display: flex;
			flex-wrap: wrap;
			gap: 6px;
		}
		.showcase-nav a {
			padding: 6px 10px;
			border: 1px solid var(--site-line);
			border-radius: var(--radius-control);
			font: 500 13px/1 var(--font-sans);
			color: var(--site-soft);
			text-decoration: none;
		}
		.showcase-nav a:hover {
			color: var(--site-ink);
			background: var(--site-hover);
		}
		.showcase-section {
			margin-bottom: 40px;
		}
		.showcase-section-title {
			margin: 0 0 16px;
			padding-bottom: 8px;
			border-bottom: 1px solid var(--site-line);
			font: 600 18px/1.3 var(--font-sans);
			letter-spacing: -0.01em;
		}
		.showcase-item {
			margin-bottom: 16px;
			border: 1px solid var(--frame-line);
			border-radius: var(--frame-radius);
			background: var(--frame-ground);
			overflow: hidden;
		}
		.showcase-item-title {
			margin: 0;
			padding: 8px 14px;
			border-bottom: 1px solid var(--site-line);
			font: 600 13px/1.4 var(--font-sans);
			color: var(--site-soft);
		}
		.showcase-item-demo {
			padding: 20px;
		}
	}
</style>
