<!--
  @file site/docs/MiniRender.svelte
  @description A widget's spec drawn small for a card on the /docs/widgets
    index. Its own module so the index can import it (and with it the whole
    widget registry) only when the first card scrolls into view. A widget with
    nothing visible at rest (a closed overlay, a node waiting on state) gets a
    quiet note instead of a blank tile; the check runs two frames after mount.
-->
<script lang="ts">
	import { Ripple } from '$lib/index.js';
	import type { Attachment } from 'svelte/attachments';

	let { spec }: { spec: Record<string, unknown> } = $props();

	let empty = $state(false);

	const measure: Attachment<HTMLElement> = (el) => {
		let id = requestAnimationFrame(() => {
			id = requestAnimationFrame(() => {
				empty = ![...el.querySelectorAll('*')].some((n) => {
					const r = n.getBoundingClientRect();
					return r.width > 0 && r.height > 0;
				});
			});
		});
		return () => cancelAnimationFrame(id);
	};
</script>

<div class="mini" {@attach measure}><Ripple {spec} /></div>
{#if empty}<p class="empty">Nothing shows at rest</p>{/if}

<style>
	.mini {
		zoom: 0.75;
	}
	/* A root that is an inline element (button, badge) sits centred; block widgets fill the card. */
	.mini > :global(.ripple-root:has(> :first-child:is(button, span, a, img, code, kbd, svg))) {
		display: flex;
		justify-content: center;
	}
	.empty {
		margin: 0;
		font-size: 12.5px;
		text-align: center;
		color: var(--site-soft);
	}
</style>
