<!--
  @file routes/live/demos/DetailHeader.svelte
  @description The lede every widget demo opens with when /live opens it in
    place. /live's own head already shows the title, the tag and the way back,
    so this is only the line on how to use the demo: the page's children, or
    the gallery caption from gallery.ts when it passes none.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { demoItems } from '../gallery.js';

	let { id, children }: { id: string; children?: Snippet } = $props();

	const item = $derived(demoItems.find((i) => i.id === id));
</script>

<p class="lede">
	{#if children}{@render children()}{:else}{item?.caption}{/if}
</p>

<style>
	.lede {
		margin: 0 0 28px;
		max-width: 68ch;
		font-family: var(--font-sans);
		font-size: 15px;
		line-height: 1.55;
		color: var(--site-soft);
	}
</style>
