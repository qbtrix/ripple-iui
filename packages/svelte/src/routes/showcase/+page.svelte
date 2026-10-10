<!--
  @file routes/showcase/+page.svelte
  @description The gen UI gallery: every widget and flow a model can ask
    Ripple for, laid out like Paw OS Discover. A compact hero (lib/discover's
    DiscoverHeader: the title with its accent half in the primary blue, the
    lead, the filter chips), then one titled section per group of tiles
    (GalleryGrid) that open each item's /showcase/<id> page. Filter chips
    (All, Do, Learn, Play, Track, Flows, Drawings) are small pills, the
    selected one filled, and narrow the page to one section; the choice is
    kept in `?group=`, read after mount because the page is prerendered.
    Atoms and tokens live on /ds, recorded runs on /live. Items come from
    gallery.ts.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import DiscoverHeader from '$lib/discover/DiscoverHeader.svelte';
	import GalleryGrid from './GalleryGrid.svelte';
	import { SHOWCASE_GROUPS, showcaseItems } from './gallery.js';

	const BLURBS: Record<string, string> = {
		Do: 'Plans, bookings and orders that get something done.',
		Learn: 'Numbers to play with and cards to practise.',
		Play: 'Small games, built from the same spec.',
		Track: 'Dashboards, timers and trackers that keep state.',
		Flows: 'Step by step forms chained in the spec.',
		Drawings: 'Animated drawings with notes on the parts.'
	};

	const groups = ['All', ...SHOWCASE_GROUPS];
	const count = (g: string) => (g === 'All' ? showcaseItems.length : showcaseItems.filter((i) => i.group === g).length);

	let group = $state('All');
	const sections = $derived(
		SHOWCASE_GROUPS.filter((g) => group === 'All' || g === group).map((g) => ({ g, items: showcaseItems.filter((i) => i.group === g) }))
	);

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
	<DiscoverHeader as="h1" title="What a model can" accent="build with Ripple" class="hero">
		<p class="lede">
			Each tile opens a live page you can use. Want to watch one get built?
			<a href="/live">See the recorded runs</a>. Looking for buttons and tokens? They are in the
			<a href="/ds">design system</a>.
		</p>
		<div class="filters" role="group" aria-label="Filter by group">
			{#each groups as g (g)}
				<button type="button" class="chip" aria-pressed={group === g} onclick={() => choose(g)}>
					{g}<span class="n">{count(g)}</span>
				</button>
			{/each}
		</div>
	</DiscoverHeader>

	<div class="sections">
		{#each sections as { g, items } (g)}
			<GalleryGrid {items} label="{g} widgets" title={g} blurb={BLURBS[g]} />
		{/each}
	</div>
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
	/* DiscoverHeader, sized for the site: compact, no 100vh. */
	.gallery :global(.hero) {
		max-width: none;
		padding: clamp(28px, 5vw, 48px) 0 32px;
	}
	/* A grid item would grow to the chip row's width on a phone. */
	.gallery :global(.hero > *) {
		min-width: 0;
	}
	.gallery :global(.hero h1) {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1.9rem, 3.6vw, 2.6rem);
		font-weight: 600;
		line-height: 1.08;
		letter-spacing: -0.03em;
		text-wrap: balance;
	}
	.lede {
		margin: 0;
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
	.sections {
		display: flex;
		flex-direction: column;
		gap: 48px;
	}
	/* Discover's filter chips: small pills, the selected one filled. */
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 32px;
		padding: 0 12px;
		border: 1px solid var(--site-line);
		border-radius: 999px;
		background: transparent;
		color: var(--site-ink);
		font: inherit;
		font-size: 13px;
		font-weight: 500;
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
		border-color: transparent;
		background: var(--site-pressed);
	}
	.chip:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.n {
		font-family: var(--font-mono);
		font-size: 11.5px;
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
			margin: -4px;
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
