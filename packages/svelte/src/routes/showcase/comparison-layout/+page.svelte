<!--
  routes/showcase/comparison-layout/+page.svelte — dev preview of the
  comparison-layout widget for screenshots and visual QA (design doc
  2026-10-09 §3.2): three fictional laptops with a winner at 760px and in a
  360px frame (each frame its own Ripple, with Choose bound to `state.pick`
  and echoed below), e-bikes with no winner and an item still waiting on its
  product_id, and a legacy spec (feature `type`, string prices, item actions)
  that must keep rendering. Linked from the /showcase gallery.
  Fictional data only: the site is public. Photos are the SVGs under
  static/photos/.
-->
<script lang="ts">
	import DetailHeader from '../DetailHeader.svelte';
	import Ripple from '$lib/Ripple.svelte';

	const laptops = {
		type: 'comparison-layout',
		bind: 'pick',
		props: {
			title: 'Three laptops for a designer who travels',
			subtitle: 'Picked from your brief: under 2 kg, all-day battery, room for Figma and light video.',
			verdict: { text: 'Aero 14 for battery and weight; Nimbus Pro 15 if you edit video.', status: 'good' },
			currency: 'USD',
			winner: {
				id: 'aero-14',
				reason: 'Lightest of the three with the longest battery, and the lowest price.',
				runner_up: { id: 'vertex-x13', reason: 'Same battery and a better keyboard, for $200 more.' }
			},
			picks: [
				{ id: 'aero-14', label: 'Best for travel' },
				{ id: 'nimbus-pro-15', label: 'Best for video' },
				{ id: 'vertex-x13', label: 'Best keyboard' }
			],
			items: [
				{ id: 'aero-14', name: 'Aero 14', subtitle: '14-inch ultralight', price: 1099, image: '/photos/aero-14.svg', product_id: 'sku-aero-14', battery: 18, weight: 1.2, screen: 14, memory: 16, storage: 512, gpu: false, rating: 4.6, extras: ['wifi', 'ports'] },
				{ id: 'nimbus-pro-15', name: 'Nimbus Pro 15', subtitle: '15-inch creator', price: 1799, image: '/photos/nimbus-pro-15.svg', battery: 11, weight: 1.9, screen: 15.6, memory: 32, storage: 1024, gpu: true, rating: 4.4, extras: ['display', 'audio'] },
				{ id: 'vertex-x13', name: 'Vertex X13', subtitle: '13-inch business', price: 1299, image: '/photos/vertex-x13.svg', battery: 18, weight: 1.3, screen: 13.3, memory: 16, storage: 512, gpu: false, rating: 4.5, extras: ['keyboard', 'security'] }
			],
			features: [
				{ key: 'battery', label: 'Battery', section: 'Everyday', kind: 'number', unit: 'h', better: 'higher', icon: 'battery', highlight: true },
				{ key: 'weight', label: 'Weight', section: 'Everyday', kind: 'number', unit: 'kg', better: 'lower', icon: 'weight', highlight: true },
				{ key: 'screen', label: 'Screen', section: 'Everyday', kind: 'number', unit: 'in', icon: 'display', highlight: true },
				{ key: 'extras', label: 'Stands out for', section: 'Everyday', kind: 'icon' },
				{ key: 'memory', label: 'Memory', section: 'Performance', kind: 'number', unit: 'GB', better: 'higher', icon: 'memory' },
				{ key: 'storage', label: 'Storage', section: 'Performance', kind: 'number', unit: 'GB', better: 'higher', icon: 'storage' },
				{ key: 'gpu', label: 'Discrete GPU', section: 'Performance', kind: 'boolean', icon: 'cpu' },
				{ key: 'price', label: 'Price', section: 'Value', kind: 'price', better: 'lower', icon: 'price' },
				{ key: 'rating', label: 'Owner rating', section: 'Value', kind: 'rating', better: 'higher', icon: 'rating' }
			]
		}
	};

	const laptopSpec = {
		state: { pick: '' },
		ui: {
			type: 'flex',
			props: { direction: 'column', gap: 4 },
			children: [laptops, { type: 'text', props: { text: 'Bound state.pick: {state.pick}' } }]
		}
	};

	const bikeSpec = {
		ui: {
			type: 'comparison-layout',
			props: {
				title: 'Commuter e-bikes under $2,500',
				currency: 'USD',
				picks: [{ id: 'harbor-c2', label: 'Longest range' }],
				items: [
					{ id: 'harbor-c2', name: 'Harbor C2', subtitle: 'Step-through', price: 2199, range: 80, weight: 24, colour: '#2f6b47', rating: 4.7, warranty: 'Two years' },
					{ id: 'pike-one', name: 'Pike One', subtitle: 'Folding', price: 1649, range: 55, weight: 19, colour: 'Sand', rating: 4.2, warranty: 'One year' },
					{ id: 'sku-loading', product_id: 'sku-ridge-s' }
				],
				features: [
					{ key: 'range', label: 'Range', kind: 'number', unit: 'km', better: 'higher', icon: 'battery', highlight: true },
					{ key: 'weight', label: 'Weight', kind: 'number', unit: 'kg', better: 'lower', icon: 'weight', highlight: true },
					{ key: 'colour', label: 'Colour', kind: 'color' },
					{ key: 'rating', label: 'Rider rating', kind: 'rating', better: 'higher' },
					{ key: 'warranty', label: 'Warranty', kind: 'text', icon: 'warranty' }
				]
			}
		}
	};

	const legacySpec = {
		ui: {
			type: 'comparison-layout',
			props: {
				title: 'Observability platforms (legacy spec)',
				description: 'Feature type, string prices and per-item actions, as older pocket specs wrote them.',
				primaryLabel: 'Choose plan',
				items: [
					{ id: 'beacon', title: 'Beacon', subtitle: 'Pro tier', price: '$15 / host / mo', ingestion: '15-day retention', apm: true, sso: true, rating: 4, actions: [{ action: 'toast', message: 'Selected Beacon', variant: 'success' }] },
					{ id: 'tracewell', title: 'Tracewell', subtitle: 'Standard', price: '$0.30 / GB', ingestion: '8-day retention', apm: true, sso: false, rating: 4 },
					{ id: 'gridline', title: 'Gridline Cloud', subtitle: 'Pro', price: '$8 / user / mo', ingestion: '13-month retention', apm: false, sso: true, rating: 5 }
				],
				features: [
					{ key: 'ingestion', label: 'Log retention', section: 'Data', highlight: true },
					{ key: 'apm', label: 'APM tracing', section: 'Features', type: 'boolean', highlight: true },
					{ key: 'sso', label: 'SSO / SAML', section: 'Security', type: 'boolean' },
					{ key: 'rating', label: 'Review score', section: 'Reviews', type: 'rating' }
				]
			}
		}
	};
</script>

<svelte:head><title>Ripple · Comparison layout</title></svelte:head>

<div class="showcase">
	<DetailHeader id="comparison-layout">Winner first, best cells marked, every price against the winner. Drag a frame's corner to cross 360 / 560 / 720.</DetailHeader>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Laptops, 760px</h2>
		<p class="section-caption">The table view with a sticky label column; Choose writes <code>state.pick</code>.</p>
		<div data-thumb class="pane frame" style:width="calc(760px + 2rem)"><Ripple spec={laptopSpec} /></div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Laptops, 360px</h2>
		<p class="section-caption">Winner card full width, the others as compact cards, features per item.</p>
		<div class="pane frame" style:width="calc(360px + 2rem)"><Ripple spec={laptopSpec} /></div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">E-bikes, no winner, 560px</h2>
		<p class="section-caption">No best-pick card; the third item waits on its product_id; colour and rating kinds.</p>
		<div class="pane frame" style:width="calc(560px + 2rem)"><Ripple spec={bikeSpec} /></div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Legacy spec, 760px</h2>
		<div class="pane frame" style:width="calc(760px + 2rem)"><Ripple spec={legacySpec} /></div>
	</section>
</div>

<style>
	.showcase {
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
		color: var(--foreground);
	}
	.section-caption {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		margin: 0 0 1rem;
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
