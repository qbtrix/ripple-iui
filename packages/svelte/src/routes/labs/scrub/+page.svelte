<!--
  @file routes/labs/scrub/+page.svelte
  @description Unlisted bench for the shared ScrubPlayer (home hero, /live):
    the bill splitter at its midpoint, with pills to swap in the other
    recorded /live streams. Prerendered, so the static HTML carries the
    midpoint frame. noindex: it is a workbench, not a page.
-->
<script lang="ts">
	import ScrubPlayer from '$lib/site/scrub/ScrubPlayer.svelte';
	import { scenarios } from '../../live/scenarios.js';

	let id = $state('bill-splitter');
	const scenario = $derived(scenarios.find((s) => s.id === id) ?? scenarios[0]);
	const chars = $derived(scenario.fixture.chunks.reduce((n, c) => n + c.text.length, 0));
	const n = $derived(scenarios.indexOf(scenario) + 1);
</script>

<svelte:head>
	<title>Ripple · Scrub player</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="bench">
	<h1>Scrub player</h1>
	<p class="lede">{scenario.fixture.prompt}</p>
	<ScrubPlayer
		fixture={scenario.fixture}
		autoplay
		caption="fig. {n}, {scenario.title.toLowerCase()}, {chars.toLocaleString('en-US')} chars, recorded from {scenario.fixture.model}"
	/>
	<div class="pills" role="group" aria-label="Recording">
		{#each scenarios as s (s.id)}
			<button type="button" aria-pressed={s.id === id} onclick={() => (id = s.id)}>{s.title}</button>
		{/each}
	</div>
</main>

<style>
	.bench {
		max-width: var(--site-max);
		margin: 0 auto;
		padding: 48px var(--site-gutter) 96px;
	}
	h1 {
		margin: 0;
		font: 600 28px/1.15 var(--font-display);
		letter-spacing: -0.02em;
		color: var(--site-ink);
	}
	.lede {
		max-width: 60ch;
		margin: 10px 0 28px;
		font-size: 15px;
		line-height: 1.55;
		color: var(--site-soft);
	}
	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 24px;
	}
	.pills button {
		height: 32px;
		padding: 0 12px;
		border: 1px solid var(--site-line);
		border-radius: 999px;
		background: transparent;
		color: var(--site-soft);
		font: 13px/1 var(--font-sans);
		cursor: pointer;
	}
	.pills button:hover {
		background: var(--site-hover);
		color: var(--site-ink);
	}
	.pills button[aria-pressed='true'] {
		background: var(--site-pressed);
		color: var(--site-ink);
		border-color: transparent;
	}
</style>
