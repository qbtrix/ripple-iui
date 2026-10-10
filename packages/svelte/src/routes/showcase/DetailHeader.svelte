<!--
  @file routes/showcase/DetailHeader.svelte
  @description The header every /showcase/<id> page opens with: a crumb back to
    the gallery (and the item's group), the title and tag from gallery.ts, and
    a lede. The page passes its own lede as children (how to use the demo);
    without one the gallery caption is the lede. Site tokens only, so it reads
    like the gallery card it came from.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { showcaseItems } from './gallery.js';

	let { id, children }: { id: string; children?: Snippet } = $props();

	const item = $derived(showcaseItems.find((i) => i.id === id));
</script>

{#if item}
	<header class="dh">
		<p class="crumb">
			<a href="/showcase">Showcase</a><span aria-hidden="true">/</span><a href="/showcase?group={item.group}">{item.group}</a>
		</p>
		<div class="title">
			<h1>{item.title}</h1>
			<span class="tag">{item.tag}</span>
		</div>
		<p class="lede">
			{#if children}{@render children()}{:else}{item.caption}{/if}
		</p>
	</header>
{/if}

<style>
	.dh {
		margin: 0 0 28px;
		font-family: var(--font-sans);
		color: var(--site-ink);
	}
	.crumb {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 12px;
		font-size: 13px;
		color: var(--site-soft);
	}
	.crumb a {
		color: var(--site-soft);
		text-decoration: none;
		border-radius: 4px;
	}
	.crumb a:hover {
		color: var(--site-ink);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.crumb a:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.title {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px 12px;
	}
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1.75rem, 3.4vw, 2.25rem);
		font-weight: 650;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}
	.tag {
		padding: 2px 8px;
		border: 1px solid var(--site-line);
		border-radius: 999px;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--site-soft);
	}
	.lede {
		margin: 10px 0 0;
		max-width: 68ch;
		font-size: 15px;
		line-height: 1.55;
		color: var(--site-soft);
	}
</style>
