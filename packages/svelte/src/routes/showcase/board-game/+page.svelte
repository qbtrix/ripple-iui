<!--
  routes/showcase/board-game/+page.svelte: dev preview of the board-game play
  widget for screenshots and visual QA: tic-tac-toe at medium with the bound
  value and on_complete in the readout, hard tic-tac-toe with the computer
  opening in a 360px frame (drag the corner), and a best-of-3 connect-four.
  URL-only (not linked from the showcase index).
-->
<script lang="ts">
	import BoardGame from '$lib/widgets/composite/BoardGame.svelte';
	import type { BoardGameValue } from '$lib/widgets/composite/BoardGame.svelte';

	let game = $state<BoardGameValue>();
	let lastSeries = $state('');
	let c4 = $state<BoardGameValue>();
</script>

<svelte:head><title>Ripple · Board game</title></svelte:head>

<div class="showcase">
	<header class="showcase-header">
		<h1>Board game</h1>
		<p>
			"Let's play tic-tac-toe, I'm X." The model picks the game and the settings; the widget plays the computer, spots the
			win and keeps score. Arrow keys move, Enter plays.
		</p>
	</header>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Tic-tac-toe, medium</h2>
		<div class="pane">
			<BoardGame game="tic-tac-toe" player="X" bind:value={game} oncomplete={(r) => (lastSeries = `${r.winner}, ${JSON.stringify(r.series)}`)} />
		</div>
		<p class="section-caption">
			Bound <code>value</code>: {game ? JSON.stringify(game) : 'not played yet'}{lastSeries ? ` · last on_complete: ${lastSeries}` : ''}
		</p>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Hard, computer opens, 360px frame</h2>
		<p class="section-caption">Unbeatable: the best you can do is draw. Drag the frame's corner.</p>
		<div class="pane frame" style:width="360px">
			<BoardGame game="tic-tac-toe" title="Can you draw?" player="O" first="computer" difficulty="hard" />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Connect four, best of 3</h2>
		<div class="pane">
			<BoardGame game="connect-four" player="red" best_of={3} bind:value={c4} />
		</div>
		<p class="section-caption">Series: {c4 ? JSON.stringify(c4.series) : 'not played yet'}</p>
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
