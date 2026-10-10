<!--
  routes/live/demos/flashcard-deck.svelte — dev preview of the
  flashcard-deck data widget for screenshots and visual QA: the landing's
  beginner Spanish deck at full width (bound score and on_complete in the
  readout), shuffled capitals with hints in a 360px frame (drag the corner),
  and long-answer biology cards. Opened in place from the /live gallery.
-->
<script lang="ts">
	import DetailHeader from './DetailHeader.svelte';
	import FlashcardDeck from '$lib/widgets/composite/FlashcardDeck.svelte';
	import type { DeckCard } from '$lib/widgets/composite/FlashcardDeck.svelte';

	const spanish: DeckCard[] = [
		{ front: 'Hello', back: 'Hola', category: 'Greetings' },
		{ front: 'Thank you', back: 'Gracias', category: 'Greetings' },
		{ front: 'Please', back: 'Por favor', category: 'Greetings' },
		{ front: 'Goodbye', back: 'Adiós', category: 'Greetings' },
		{ front: 'Water', back: 'Agua', hint: 'Sounds like "aqua"', category: 'Food and drink' },
		{ front: 'House', back: 'Casa', category: 'Everyday words' },
		{ front: 'Friend', back: 'Amigo / Amiga', category: 'People' },
		{ front: 'Where is the bathroom?', back: '¿Dónde está el baño?', category: 'Travel' }
	];
	let spanishScore = $state(0);
	let lastPass = $state('');

	const capitals: DeckCard[] = [
		{ front: 'Canada', back: 'Ottawa', hint: 'Not Toronto' },
		{ front: 'Australia', back: 'Canberra', hint: 'A planned city between two bigger ones' },
		{ front: 'Brazil', back: 'Brasília' },
		{ front: 'Turkey', back: 'Ankara', hint: 'Not Istanbul' },
		{ front: 'New Zealand', back: 'Wellington' },
		{ front: 'Morocco', back: 'Rabat' }
	];

	const biology: DeckCard[] = [
		{ front: 'What does the mitochondrion do?', back: 'Turns food into usable energy (ATP) through cellular respiration.', category: 'Cells' },
		{ front: 'Osmosis', back: 'Water moving across a membrane from the weaker solution to the stronger one.', category: 'Transport' },
		{ front: 'What is a gene?', back: 'A stretch of DNA that codes for one protein or functional RNA.', category: 'Genetics' }
	];
</script>


<div class="showcase">
	<DetailHeader id="flashcard-deck">"Make me a short deck of beginner Spanish flip cards. Let me flip each one, mark if I knew it, and see my score." Finish a pass to see the score screen, then try Practise missed.</DetailHeader>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Beginner Spanish, full width</h2>
		<div data-thumb class="pane">
			<FlashcardDeck
				title="Beginner Spanish"
				subtitle="Flip, then mark whether you knew it"
				cards={spanish}
				bind:score={spanishScore}
				oncomplete={(r) => (lastPass = `${r.score} of ${r.total}`)}
			/>
		</div>
		<p class="section-caption">Bound <code>score</code>: {spanishScore}{lastPass ? ` · last on_complete: ${lastPass}` : ''}</p>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Capitals, shuffled with hints, 360px frame</h2>
		<p class="section-caption">Drag the frame's corner. The order is seeded, so the server and the browser deal the same first card.</p>
		<div class="pane frame" style:width="360px">
			<FlashcardDeck title="World capitals" cards={capitals} shuffle />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Long answers</h2>
		<div class="pane">
			<FlashcardDeck
				title="Biology basics"
				verdict={{ text: 'Three core ideas for Monday’s quiz; say each answer out loud before you flip.', status: 'info' }}
				cards={biology}
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
</style>
