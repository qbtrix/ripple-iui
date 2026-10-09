<!--
  @file site/docs/MiniRender.svelte
  @description A widget's example drawn small for a card on the /docs/widgets
    index. Its own module so the index can import it (and with it the whole
    widget registry) only when the first card scrolls into view.
-->
<script lang="ts">
	import { Ripple } from '$lib/index.js';

	let { spec }: { spec: Record<string, unknown> } = $props();
</script>

<div class="mini"><Ripple {spec} /></div>

<style>
	.mini {
		zoom: 0.75;
	}
	/* A root that is an inline element (button, badge) sits centred; block widgets fill the card. */
	.mini > :global(.ripple-root:has(> :first-child:is(button, span, a, img, code, kbd, svg))) {
		display: flex;
		justify-content: center;
	}
</style>
