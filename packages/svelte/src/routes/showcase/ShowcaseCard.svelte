<!--
  @file routes/showcase/ShowcaseCard.svelte
  @description One /showcase index card: a framed live render above the title,
    category and one line, the whole card one link to its detail page. The
    render mounts only while the card is near the viewport and unmounts when it
    leaves, so the grid never holds more Ripple roots than fit on screen, and
    nothing renders during prerender (no roots in the HTML, none to hydrate).
    A card gets either `spec` (a widget, pattern or flow) or `app` (a sub-page
    slug: that +page.svelte is lazy-imported and drawn at a desktop width,
    scaled to the card). Previews are inert and hidden from assistive tech;
    the detail page is where they are interactive.
-->
<script lang="ts" module>
	import type { Component } from 'svelte';
	const pages = import.meta.glob<{ default: Component }>('./*/+page.svelte');
</script>

<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { Ripple } from '$lib/index.js';
	import type { ShowcaseItem } from '$lib/site/showcase/catalog.js';
	import { thumbContext } from './ShowcasePage.svelte';

	let {
		item,
		label,
		spec,
		app,
		width
	}: {
		item: ShowcaseItem;
		label: string;
		spec?: Record<string, unknown>;
		app?: string;
		/** Lay the preview out at this width and scale it to the card. Unset: natural size, centred. */
		width?: number;
	} = $props();

	// A sub-page drawn in this card skips its own header (ShowcasePage).
	thumbContext(true);

	let near = $state(false);
	let frameWidth = $state(0);
	const zoom = $derived(width && frameWidth ? frameWidth / width : 1);
	const load = $derived(app ? pages[`./${app}/+page.svelte`] : undefined);

	const watch: Attachment<HTMLElement> = (el) => {
		const io = new IntersectionObserver(([e]) => (near = e.isIntersecting), { rootMargin: '400px 0px' });
		io.observe(el);
		return () => io.disconnect();
	};
</script>

<a class="card" href={item.href} {@attach watch}>
	<div class="frame" class:scaled={!!width} bind:clientWidth={frameWidth} inert aria-hidden="true" data-pagefind-ignore="all">
		{#if near}
			<div class="stage" style:width={width ? `${width}px` : undefined} style:zoom>
				{#if spec}
					<Ripple {spec} />
				{:else if load}
					{#await load() then mod}
						<mod.default data={{}} params={{}} />
					{/await}
				{/if}
			</div>
		{/if}
	</div>
	<div class="meta">
		<span class="title">{item.title}</span>
		<span class="cat">{label}</span>
		<span class="line">{#each item.line.split('`') as part, i (i)}{#if i % 2}<code>{part}</code>{:else}{part}{/if}{/each}</span>
	</div>
</a>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
		color: inherit;
		text-decoration: none;
		border-radius: var(--radius-card);
	}
	.card:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 4px;
	}
	.frame {
		position: relative;
		height: 240px;
		overflow: hidden;
		border: 1px solid var(--frame-line);
		border-radius: var(--frame-radius);
		background: var(--frame-ground);
		display: grid;
		place-items: center;
		padding: 16px;
		box-sizing: border-box;
		pointer-events: none;
		transition: border-color 0.15s;
	}
	.frame.scaled {
		place-items: start;
		padding: 0;
	}
	.card:hover .frame {
		border-color: color-mix(in oklch, var(--site-ink) 22%, transparent);
	}
	.stage {
		max-width: 100%;
		min-width: 0;
	}
	.frame:not(.scaled) .stage {
		width: 100%;
	}
	.scaled .stage {
		max-width: none;
		padding: 8px;
		box-sizing: border-box;
	}
	.meta {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2px 12px;
		padding: 0 2px;
	}
	.title {
		font: 600 15px/1.35 var(--font-sans);
		color: var(--site-ink);
	}
	.line code {
		font: 0.9em/1 var(--font-mono);
	}
	.cat {
		font: 400 13px/1.5 var(--font-sans);
		color: var(--site-soft);
	}
	.line {
		grid-column: 1 / -1;
		overflow-wrap: anywhere;
		font: 400 14px/1.45 var(--font-sans);
		color: var(--site-soft);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
