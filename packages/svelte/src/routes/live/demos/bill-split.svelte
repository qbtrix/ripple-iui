<!--
  routes/live/demos/bill-split.svelte — dev preview of the bill-split data
  widget for screenshots and visual QA: the landing's dinner for 4 at full
  width (bound, so edits show in the readout), the same bill in a 360px frame
  (drag the corner to resize), and a 5-person bill with tax so the grid shows
  how it avoids a lone last card. Opened in place from the /live gallery.
-->
<script lang="ts">
	import DetailHeader from './DetailHeader.svelte';
	import BillSplit from '$lib/widgets/composite/BillSplit.svelte';
	import type { BillValue } from '$lib/widgets/composite/bill-split.js';

	const dinner = [
		{ id: 'p1', name: 'Alex', extras: 12 },
		{ id: 'p2', name: 'Sam' },
		{ id: 'p3', name: 'Priya', extras: 9 },
		{ id: 'p4', name: 'Jo' }
	];
	let value = $state<BillValue | undefined>();
</script>

<div class="showcase">
	<DetailHeader id="bill-split">The bill, the tip and the people in; the widget does the cents-exact split and the layout.</DetailHeader>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Dinner for 4 came to $186.40</h2>
		<p class="section-caption">The landing prompt. Change the tip, someone's drinks, or add a person; the bound value updates below.</p>
		<div data-thumb class="pane">
			<BillSplit title="Dinner for 4" subtotal={186.4} tip_percent={18} people={dinner} bind:value />
		</div>
		<p class="readout">Bound: {value ? JSON.stringify(value) : 'nothing edited yet'}</p>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">The same bill at 360px</h2>
		<p class="section-caption">Two columns of cards on a phone.</p>
		<div class="pane frame" style="width: 360px">
			<BillSplit title="Dinner for 4" subtotal={186.4} tip_percent={18} people={dinner} />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Five people, tax on top, euros</h2>
		<p class="section-caption">Three columns wide, so the fifth card is never alone in a row.</p>
		<div class="pane">
			<BillSplit
				title="Team lunch"
				currency="EUR"
				subtotal={142.5}
				tax={11.4}
				tip_percent={10}
				tip_options={[0, 5, 10, 15]}
				extras_label="Wine"
				note="Tip on the bill before tax."
				people={[
					{ id: 'a', name: 'Mia', extras: 18 },
					{ id: 'b', name: 'Leo' },
					{ id: 'c', name: 'Noor', extras: 6.5 },
					{ id: 'd', name: 'Tom' },
					{ id: 'e', name: 'Ines' }
				]}
			/>
		</div>
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
		margin-bottom: 0.75rem;
	}
	.frame {
		max-width: 100%;
		resize: horizontal;
		overflow: auto;
	}
	.readout {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}
</style>
