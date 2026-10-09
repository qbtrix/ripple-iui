<!--
  routes/showcase/growth-projection/+page.svelte — dev preview of the
  growth-projection data widget for screenshots and visual QA: the landing's
  prompt ($300 a month at 5% for 10 years, with a goal) at full width, a lump
  sum with no deposits (yearly compounding, inflation) in a 360px frame (drag
  the corner to resize), and clamped model input. The first binds `deposit`,
  so slider edits show in the readout. URL-only (not linked from the showcase
  index).
-->
<script lang="ts">
	import GrowthProjection from '$lib/widgets/composite/GrowthProjection.svelte';

	let deposit = $state(300);
	let rate = $state(5);
	let years = $state(10);
</script>

<div class="showcase">
	<header class="showcase-header">
		<h1>growth-projection</h1>
		<p>Four numbers in; the widget computes the schedule, the chart, the yearly table and the totals.</p>
	</header>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Save $300 a month at 5% for 10 years</h2>
		<p class="section-caption">The landing prompt. Hover or arrow through the chart; drag a slider and the bound values update below.</p>
		<div class="pane">
			<GrowthProjection
				title="Savings growth"
				verdict={{ text: 'Steady $300 a month gets you to about $46,600; the $50,000 goal lands in year 11.', status: 'info' }}
				bind:deposit
				bind:rate
				bind:years
				goal={50000}
			/>
		</div>
		<p class="readout">Bound: deposit {deposit}, rate {rate}%, years {years}</p>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">A lump sum, no deposits (360px)</h2>
		<p class="section-caption">$10,000 left alone at 4.2%, compounded yearly, with 2.5% inflation.</p>
		<div class="pane frame" style="width: 360px">
			<GrowthProjection
				title="Leave the bonus invested"
				subtitle="Euro savings account, 15 years"
				currency="EUR"
				initial={10000}
				deposit={0}
				rate={4.2}
				years={15}
				compounding="yearly"
				inflation={2.5}
			/>
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Absurd model input</h2>
		<p class="section-caption">A 250% rate and a negative deposit: clamped, and the widget says so.</p>
		<div class="pane">
			<GrowthProjection title="Get rich quick" initial={500} deposit={-50} rate={250} years={6} />
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
	.showcase-header h1 {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 0 0.25rem;
	}
	.showcase-header p,
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
