<!--
  routes/showcase/interval-workout/+page.svelte — dev preview of the
  interval-workout data widget for screenshots and visual QA: the landing's
  20-minute home HIIT at full width (bound workSec in the readout), a Tabata
  block with four round bars, and a desk-break mobility set in a 360px frame
  (drag the corner to resize). URL-only (not linked from the showcase index).
-->
<script lang="ts">
	import IntervalWorkout from '$lib/widgets/composite/IntervalWorkout.svelte';
	import type { WorkoutExercise } from '$lib/widgets/composite/IntervalWorkout.svelte';

	const hiit: WorkoutExercise[] = [
		{ name: 'Jumping jacks', cue: 'Land softly and keep a steady rhythm.', kind: 'cardio' },
		{ name: 'Bodyweight squats', cue: 'Chest up, hips back, drive through the heels.', kind: 'strength' },
		{ name: 'Mountain climbers', cue: 'Hands under shoulders, drive the knees fast.', kind: 'core' },
		{ name: 'Push-ups', cue: 'Drop to your knees if form slips. Keep the core tight.', kind: 'strength' },
		{ name: 'High knees', cue: 'Run in place, knees to hip height.', kind: 'cardio' },
		{ name: 'Reverse lunges', cue: 'Step back, drop the knee, alternate legs.', kind: 'strength' },
		{ name: 'Plank shoulder taps', cue: 'Feet wide, hips still as you tap.', kind: 'core' },
		{ name: 'Skater hops', cue: 'Leap side to side, land on one soft foot.', kind: 'cardio' },
		{ name: 'Glute bridges', cue: 'Squeeze at the top for a beat.', kind: 'strength' },
		{ name: 'Burpees', cue: 'Squat, jump back, jump in, jump up.', kind: 'cardio' }
	];
	let hiitWork = $state(40);
	let hiitStep = $state(0);

	const tabata: WorkoutExercise[] = [
		{ name: 'Squat jumps', cue: 'Explode up, land quiet.', kind: 'cardio' },
		{ name: 'Hollow hold', cue: 'Lower back pressed into the floor.', kind: 'core' }
	];

	const desk: WorkoutExercise[] = [
		{ name: 'Neck rolls', cue: 'Slow half circles, ear to shoulder.', kind: 'mobility' },
		{ name: 'Seated twist', cue: 'Tall spine, turn from the ribs.', kind: 'mobility' },
		{ name: 'Wall angels', cue: 'Back flat to the wall, slide the arms up.', kind: 'mobility' },
		{ name: 'Water break', cue: 'A few sips, then shake out the hands.', kind: 'rest' },
		{ name: 'Calf raises', cue: 'Up on the toes, lower for three counts.', kind: 'strength' },
		{ name: 'Standing hip circles', kind: 'mobility' }
	];
	let deskWork = $state(30);
</script>

<svelte:head><title>Ripple · Interval workout</title></svelte:head>

<div class="showcase">
	<header class="showcase-header">
		<h1>Interval workout</h1>
		<p>
			"Give me a 20-minute HIIT workout I can do at home. Walk me through it one exercise at a time and let me set the work interval."
			Press Start; change Work mid-interval and it waits for the next one. Hide the tab and it pauses.
		</p>
	</header>

	<section class="showcase-section">
		<h2 class="showcase-section-title">20-minute home HIIT, full width</h2>
		<div class="pane">
			<IntervalWorkout
				title="20-minute home HIIT"
				subtitle="No equipment · 2 rounds"
				verdict={{ text: 'Ten moves, twice through; drop push-ups to your knees if form slips.', status: 'info' }}
				exercises={hiit}
				restSec={20}
				rounds={2}
				bind:workSec={hiitWork}
				bind:step={hiitStep}
			/>
		</div>
		<p class="section-caption">Bound <code>workSec</code>: {hiitWork}s · step {hiitStep}</p>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Tabata, four rounds</h2>
		<div class="pane">
			<IntervalWorkout title="Tabata finisher" subtitle="20 on, 10 off" exercises={tabata} workSec={20} restSec={10} rounds={4} />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Desk break, 360px frame</h2>
		<p class="section-caption">Drag the frame's corner. No verdict, so the total time leads; the water break is a rest block.</p>
		<div class="pane frame" style:width="360px">
			<IntervalWorkout title="Desk break" exercises={desk} restSec={10} bind:workSec={deskWork} />
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
</style>
