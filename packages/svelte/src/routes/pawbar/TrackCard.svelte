<!--
  @file routes/pawbar/TrackCard.svelte
  @description The host-built tracking card: Ripple's `order-status` widget
    (stepper, ETA, map with the restaurant, the drop-off, the route and the
    courier, the activity list). The spec is fixed (pay/orders.ts trackSpec)
    and never comes from the model; each poll only changes the `state` prop,
    which Ripple syncs key by key, so the card and its map never remount and
    keep the visitor's pan and zoom. Tiles are OpenStreetMap's (`osm` preset,
    attribution kept); on the dark theme a filter scoped to this card's tile
    pane darkens them, leaving markers and the route untouched.
-->
<script lang="ts">
	import { Ripple } from '$lib/index.js';
	import { trackSpec, trackState, type Order, type Tracking } from '../pay/orders.js';

	let { orderId, tracking, fulfilment }: { orderId: string; tracking: Tracking; fulfilment: Order['fulfilment'] } = $props();

	const spec = trackSpec();
	const state = $derived(trackState(orderId, tracking, fulfilment));
</script>

<section class="track" aria-label="Order tracking">
	<Ripple {spec} {state} />
</section>

<style>
	.track {
		padding: 14px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-paw);
		background: var(--site-card, var(--card));
		min-width: 0;
	}
	:global(.dark) .track :global(.leaflet-tile-pane) {
		filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9);
	}
</style>
