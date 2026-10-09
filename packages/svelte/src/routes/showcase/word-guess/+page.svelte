<!--
  routes/showcase/word-guess/+page.svelte — dev preview of the word-guess data
  widget for screenshots and visual QA: a five-letter game with a hint at full
  width (bound value and on_complete in the readout), a seven-letter game in a
  360px frame (drag the corner), a four-letter game with three guesses, and the
  inline error a bad answer gets. URL-only (not linked from the showcase index).
-->
<script lang="ts">
	import WordGuess, { type WordGuessValue } from '$lib/widgets/composite/WordGuess.svelte';

	let game = $state<WordGuessValue>();
	let lastGame = $state('');
</script>

<svelte:head><title>Ripple · Word guess</title></svelte:head>

<div class="showcase">
	<header class="showcase-header">
		<h1>Word guess</h1>
		<p>
			"Give me a five-letter word game about the kitchen, with a hint if I get stuck."
			Click the board (or Tab to it) and type, or use the on-screen keys. The answer here is WHISK.
		</p>
	</header>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Five letters with a hint, full width</h2>
		<div class="pane">
			<WordGuess
				title="Kitchen words"
				answer="whisk"
				hint="You beat eggs with it"
				bind:value={game}
				oncomplete={(r) => (lastGame = `${r.won ? 'won' : 'lost'} in ${r.guesses.length}`)}
			/>
		</div>
		<p class="section-caption">
			Bound <code>value</code>: {game ? `${game.guesses.length} guesses, ${game.status}${game.hint_used ? ', hint used' : ''}` : 'none yet'}{lastGame ? ` · last on_complete: ${lastGame}` : ''}
		</p>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Seven letters, 360px frame</h2>
		<p class="section-caption">Drag the frame's corner. The answer is PLANETS.</p>
		<div class="pane frame" style:width="360px">
			<WordGuess title="Space words" answer="planets" />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Four letters, three guesses</h2>
		<div class="pane">
			<WordGuess title="Quick one" answer="moon" max_guesses={3} hint="It has phases" />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">A bad answer</h2>
		<div class="pane">
			<WordGuess answer="r2-d2" />
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
