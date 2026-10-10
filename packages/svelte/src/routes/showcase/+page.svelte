<!--
  @file routes/showcase/+page.svelte
  @description The gen UI gallery: every widget and flow a model can ask
    Ripple for, as a grid of thumbnail cards (GalleryGrid) that open each
    item's /showcase/<id> page. Filter chips (All, Do, Learn, Play, Track,
    Flows, Drawings) narrow the grid and keep the choice in `?group=`, read
    after mount because the page is prerendered. The grid comes first on every
    screen; there is no sidebar. Atoms and tokens live on /ds, recorded runs on
    /live. Items come from gallery.ts.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import GalleryGrid from './GalleryGrid.svelte';
	import { SHOWCASE_GROUPS, showcaseItems } from './gallery.js';

	const groups = ['All', ...SHOWCASE_GROUPS];
	const count = (g: string) => (g === 'All' ? showcaseItems.length : showcaseItems.filter((i) => i.group === g).length);

	let group = $state('All');
	const shown = $derived(group === 'All' ? showcaseItems : showcaseItems.filter((i) => i.group === group));

	function choose(g: string) {
		group = g;
		replaceState(g === 'All' ? '/showcase' : `/showcase?group=${encodeURIComponent(g)}`, {});
	}

	onMount(() => {
		const wanted = new URLSearchParams(location.search).get('group');
		if (wanted && groups.includes(wanted)) group = wanted;
	});
</script>

<svelte:head>
	<title>Showcase · Ripple</title>
	<meta
		name="description"
		content="The interfaces a model can ask Ripple for: trip plans, bookings, games, trackers, step-by-step flows and annotated drawings. Each one opens as a live page."
	/>
</svelte:head>

<main class="gallery">
	<header class="head">
		<h1>Showcase</h1>
		<p class="lede">
			What a model can ask Ripple for. Each card opens a live page you can use. Want to watch one get built?
			<a href="/live">See the recorded runs</a>. Looking for buttons and tokens? They are in the
			<a href="/ds">design system</a>.
		</p>
	</header>

	<div class="filters" role="group" aria-label="Filter by group">
		{#each groups as g (g)}
			<button type="button" class="chip" aria-pressed={group === g} onclick={() => choose(g)}>
				{g}<span class="n">{count(g)}</span>
			</button>
		{/each}
	</div>

	<GalleryGrid items={shown} label="{group === 'All' ? 'All' : group} widgets" />
</main>

<style>
	.gallery {
		box-sizing: border-box;
		width: 100%;
		max-width: var(--site-max);
		margin: 0 auto;
		padding: 0 var(--site-gutter) 72px;
		font-family: var(--font-sans);
		color: var(--site-ink);
	}
	.head {
		padding: clamp(28px, 5vw, 48px) 0 20px;
	}
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2rem, 4vw, 2.75rem);
		font-weight: 650;
		line-height: 1.05;
		letter-spacing: -0.03em;
	}
	.lede {
		margin: 12px 0 0;
		max-width: 64ch;
		font-size: 16px;
		line-height: 1.55;
		color: var(--site-soft);
	}
	.lede a {
		color: var(--primary-ink);
		text-underline-offset: 3px;
	}
	.lede a:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
		border-radius: 2px;
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 0 0 20px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		padding: 0 14px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-chip);
		background: transparent;
		color: var(--site-ink);
		font: inherit;
		font-size: 14px;
		white-space: nowrap;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.chip:hover {
		background: var(--site-hover);
	}
	.chip[aria-pressed='true'] {
		border-color: var(--primary);
		box-shadow: inset 0 0 0 1px var(--primary);
	}
	.chip:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.n {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--site-soft);
	}
	/* Phones: one row of chips that scrolls sideways, so the grid starts high. */
	@media (max-width: 639px) {
		.gallery {
			padding-inline: 16px;
		}
		.filters {
			flex-wrap: nowrap;
			overflow-x: auto;
			scrollbar-width: none;
			padding: 4px;
			margin: -4px -4px 16px;
		}
		.filters::-webkit-scrollbar {
			display: none;
		}
		.chip {
			flex: none;
			min-height: 44px;
		}
	}
</style>
