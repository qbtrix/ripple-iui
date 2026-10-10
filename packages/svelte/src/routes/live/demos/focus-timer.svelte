<!--
  routes/live/demos/focus-timer.svelte: dev preview of the focus-timer
  data widget for screenshots and visual QA. The live ask at full width with
  the bound value in the readout, a one-minute demo cycle with auto start to
  watch the phases turn over, and a 360px frame (drag the corner to resize).
  Opened in place from the /live gallery.
-->
<script lang="ts">
	import DetailHeader from './DetailHeader.svelte';
	import FocusTimer from '$lib/widgets/composite/FocusTimer.svelte';
	import type { FocusValue } from '$lib/widgets/composite/FocusTimer.svelte';

	let session = $state<FocusValue | undefined>();
</script>


<div class="showcase">
	<DetailHeader id="focus-timer">"A pomodoro timer with work and break sessions and a count of finished rounds." Press Start or Space. When a phase ends it waits with a call to action; hide the tab and the time stays right.</DetailHeader>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Pomodoro, goal of eight rounds</h2>
		<div data-thumb class="pane">
			<FocusTimer title="Deep work" goal_rounds={8} task="Draft the quarterly update" bind:value={session} />
		</div>
		<p class="section-caption">
			Bound <code>value</code>: {session ? `${session.phase} · ${session.remaining_s}s · ${session.running ? 'running' : 'stopped'} · ${session.rounds_done} rounds` : 'nothing yet'}
		</p>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">One-minute demo cycle, auto start</h2>
		<p class="section-caption">1 minute focus, 1 minute breaks, a long break after every second round.</p>
		<div class="pane">
			<FocusTimer title="Demo cycle" focus_min={1} short_break_min={1} long_break_min={1} rounds_before_long={2} auto_start_next />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">360px frame</h2>
		<div class="pane frame" style:width="360px">
			<FocusTimer focus_min={50} short_break_min={10} long_break_min={30} rounds_before_long={3} task="Study for the exam" />
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
