<!--
  routes/showcase/memory-match/+page.svelte — dev preview of the memory-match
  play widget for screenshots and visual QA: a Spanish-animals deck (word to
  emoji, long words autoscaled) at full width with the bound value and
  on_complete in the readout, an emoji-only deck with a time limit in a 360px
  frame (drag the corner), and a word-to-word deck with icon keys.
  Linked from the /showcase gallery.
-->
<script lang="ts">
	import DetailHeader from '../DetailHeader.svelte';
	import MemoryMatch from '$lib/widgets/composite/MemoryMatch.svelte';
	import type { MatchPair, MemoryMatchValue } from '$lib/widgets/composite/MemoryMatch.svelte';

	const animals: MatchPair[] = [
		{ id: 'dog', a: 'perro', b: '🐶' },
		{ id: 'cat', a: 'gato', b: '🐱' },
		{ id: 'horse', a: 'caballo', b: '🐴' },
		{ id: 'bird', a: 'pájaro', b: '🐦' },
		{ id: 'cow', a: 'vaca', b: '🐮' },
		{ id: 'hippo', a: 'hipopótamo', b: '🦛' },
		{ id: 'butterfly', a: 'mariposa', b: '🦋' },
		{ id: 'squirrel', a: 'ardilla', b: '🐿️' }
	];
	let game = $state<MemoryMatchValue>();
	let lastWin = $state('');

	const emoji: MatchPair[] = [
		{ id: 'apple', a: '🍎', b: '🍎' },
		{ id: 'rocket', a: '🚀', b: '🚀' },
		{ id: 'cactus', a: '🌵', b: '🌵' },
		{ id: 'guitar', a: '🎸', b: '🎸' },
		{ id: 'ghost', a: '👻', b: '👻' },
		{ id: 'pizza', a: '🍕', b: '🍕' }
	];

	const travel: MatchPair[] = [
		{ id: 'train', a: 'icon:train', b: 'el tren' },
		{ id: 'flight', a: 'icon:flight', b: 'el avión' },
		{ id: 'bus', a: 'icon:bus', b: 'el autobús' },
		{ id: 'car', a: 'icon:car', b: 'el coche' },
		{ id: 'ferry', a: 'icon:ferry', b: 'el transbordador' },
		{ id: 'walk', a: 'icon:walk', b: 'a pie' }
	];
</script>

<svelte:head><title>Ripple · Memory match</title></svelte:head>

<div class="showcase">
	<DetailHeader id="memory-match">"Make me a memory game to learn Spanish animal names." Flip two cards at a time; a match stays up, a miss turns back. Arrow keys move between cards and Enter flips.</DetailHeader>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Spanish animals, full width</h2>
		<div data-thumb class="pane">
			<MemoryMatch title="Spanish animals" pairs={animals} bind:value={game} oncomplete={(r) => (lastWin = `${r.moves} moves, ${r.seconds}s`)} />
		</div>
		<p class="section-caption">
			Bound <code>value</code>: {game ? JSON.stringify(game) : 'not played yet'}{lastWin ? ` · last on_complete: ${lastWin}` : ''}
		</p>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Emoji deck, 90 second limit, 360px frame</h2>
		<p class="section-caption">Drag the frame's corner. The deal is seeded, so the server and the browser agree.</p>
		<div class="pane frame" style:width="360px">
			<MemoryMatch title="Emoji pairs" pairs={emoji} time_limit_s={90} />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Icon keys to words</h2>
		<div class="pane">
			<MemoryMatch title="Getting around" pairs={travel} columns={6} />
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
