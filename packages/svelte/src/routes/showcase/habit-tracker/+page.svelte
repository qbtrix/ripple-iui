<!--
  routes/showcase/habit-tracker/+page.svelte: dev preview of the
  habit-tracker data widget for screenshots and visual QA: a seeded four-habit
  week with two weeks of history at full width (the bound value in the
  readout), a fresh Sunday-start tracker, and the seeded tracker again in a
  360px frame where rows become cards (drag the corner to resize). Dates come
  from the browser's clock. Linked from the /showcase gallery.
-->
<script lang="ts">
	import DetailHeader from '../DetailHeader.svelte';
	import HabitTracker from '$lib/widgets/composite/HabitTracker.svelte';
	import type { HabitValue } from '$lib/widgets/composite/habit-tracker.js';

	const habits = [
		{ id: 'read', name: 'Read 20 pages', icon: 'read', target_per_week: 5 },
		{ id: 'run', name: 'Run', icon: 'run', target_per_week: 3 },
		{ id: 'water', name: 'Drink 2L water', icon: 'water', target_per_week: 7 },
		{ id: 'meditate', name: 'Meditate', icon: 'meditate', target_per_week: 4 }
	];
	const seed = { read: [1, 2, 3, 5, 8, 9], run: [2, 4, 9], water: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], meditate: [1, 7] };
	let value = $state<HabitValue | undefined>();
	const ticked = $derived(value ? Object.values(value.ticks).reduce((n, d) => n + d.length, 0) : 0);
</script>

<svelte:head><title>Ripple · Habit tracker</title></svelte:head>

<div class="showcase">
	<DetailHeader id="habit-tracker">"Set me up a habit tracker for reading, running, water and meditation." Tick a day, arrow around the grid, add a habit with an icon, rename one, remove one. Nothing is stored: a reload starts from the spec.</DetailHeader>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Seeded week, two weeks of history</h2>
		<div data-thumb class="pane">
			<HabitTracker title="My week" {habits} {seed} weeks={2} bind:value />
		</div>
		<p class="section-caption">Bound <code>value</code>: {value ? `${value.habits.length} habits, ${ticked} ticks` : 'untouched'}</p>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Fresh tracker, weeks start Sunday</h2>
		<div class="pane">
			<HabitTracker
				title="Evening routine"
				week_start="sun"
				habits={[
					{ id: 'stretch', name: 'Stretch', icon: 'stretch', target_per_week: 5 },
					{ id: 'journal', name: 'Journal', icon: 'journal', target_per_week: 7 }
				]}
			/>
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">360px frame</h2>
		<p class="section-caption">Drag the frame's corner: below 560px each habit is a card with seven day dots.</p>
		<div class="pane frame" style:width="360px">
			<HabitTracker title="My week" {habits} {seed} />
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
</style>
