<!--
  routes/live/demos/order-status.svelte: the order-status widget, the
  tracking card a chat shows after a checkout. A fictional order out for
  delivery with a live map (the `osm` tiles the CSP allows), the timeline and
  the courier actions, at full width and in a 360px frame. Opened in place from the /live gallery (group Track).
-->
<script lang="ts">
	import DetailHeader from './DetailHeader.svelte';
	import { Ripple } from '$lib/index.js';

	const spec = {
		version: '1.0' as const,
		ui: {
			type: 'order-status',
			props: {
				orderId: 'CG-1042',
				status: 'out-for-delivery',
				eta: 'Today, 4 to 6 PM',
				tracking: { carrier: 'Parcelwise', number: 'PW 4471 0923 18' },
				origin: { name: 'Copper Griddle kitchen', address: 'Oakland, CA', lat: 37.79, lng: -122.41 },
				destination: { name: 'Home', address: '500 Howard St, San Francisco, CA', lat: 37.7884, lng: -122.4 },
				tracker: { lat: 37.785, lng: -122.405, heading: 45, label: 'Courier' },
				events: [
					{ time: '11:42 AM', label: 'Out for delivery', location: 'San Francisco, CA', icon: 'truck' },
					{ time: '07:18 AM', label: 'Left the kitchen', location: 'Oakland, CA' },
					{ time: 'Yesterday 9:02 PM', label: 'Packed', location: 'Oakland, CA' },
					{ time: 'Yesterday 11:14 AM', label: 'Order placed' }
				],
				actions: [
					{ id: 'contact', label: 'Contact courier', icon: 'phone', variant: 'outline' },
					{ id: 'issue', label: 'Report issue', icon: 'alert-triangle', variant: 'ghost' }
				]
			}
		}
	};
</script>


<div class="showcase">
	<DetailHeader id="order-status">The card a chat shows once an order is paid: where it is, when it lands and what happened so far.</DetailHeader>

	<section class="showcase-section">
		<div data-thumb class="pane"><Ripple {spec} /></div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">360px frame</h2>
		<div class="pane frame" style:width="360px"><Ripple {spec} /></div>
	</section>
</div>

<style>
	.showcase {
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
		color: var(--foreground);
	}
	.showcase-section {
		margin-bottom: 2.5rem;
	}
	.showcase-section-title {
		font-size: 1.15rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border);
	}
	.pane {
		padding: 1rem;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--muted) 35%, var(--background));
	}
	.frame {
		max-width: 100%;
		resize: horizontal;
		overflow: auto;
	}
</style>
