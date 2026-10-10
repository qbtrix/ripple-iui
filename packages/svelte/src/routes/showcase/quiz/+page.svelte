<!--
  routes/showcase/quiz/+page.svelte — dev preview of the quiz data widget for
  screenshots and visual QA: space trivia at full width (bound value and
  on_complete in the readout), a timed and shuffled round in a 360px frame
  (drag the corner), and a quiz with photos. URL-only (not linked from the
  showcase index).
-->
<script lang="ts">
	import Quiz from '$lib/widgets/composite/Quiz.svelte';
	import type { QuizItem, QuizValue } from '$lib/widgets/composite/quiz.js';

	const space: QuizItem[] = [
		{ prompt: 'Which planet has the shortest day?', choices: ['Earth', 'Jupiter', 'Mars', 'Venus'], answer: 1, why: 'Jupiter turns once in just under 10 hours.' },
		{ prompt: 'What is the closest star to the Sun?', choices: ['Sirius', 'Betelgeuse', 'Proxima Centauri', 'Polaris'], answer: 2, why: 'Proxima Centauri is about 4.2 light years away.' },
		{ prompt: 'How long does sunlight take to reach Earth?', choices: ['8 seconds', 'About 8 minutes', 'About 8 hours'], answer: 1, why: 'Light crosses the 150 million km in roughly 8 minutes 20 seconds.' },
		{ prompt: 'Which planet spins on its side?', choices: ['Uranus', 'Neptune', 'Saturn', 'Mercury'], answer: 0, why: 'Uranus is tilted about 98 degrees, probably from an ancient collision.' },
		{ prompt: 'What is the largest volcano in the solar system?', choices: ['Mauna Kea', 'Olympus Mons', 'Maxwell Montes'], answer: 1, why: 'Olympus Mons on Mars stands about 22 km high.' },
		{ prompt: 'A day on Venus is longer than its year.', choices: ['True', 'False'], answer: 0, why: 'Venus takes 243 Earth days to spin once and 225 to orbit the Sun.' },
		{ prompt: 'Which moon has a thick atmosphere?', choices: ['Europa', 'Titan', 'Io', 'Ganymede', 'Phobos'], answer: 1, why: 'Titan, Saturn\'s largest moon, has air denser than Earth\'s.' },
		{ prompt: 'Roughly how old is the Sun?', choices: ['4.6 million years', '460 million years', '4.6 billion years'], answer: 2, why: 'The Sun formed about 4.6 billion years ago.' }
	];
	let spaceValue = $state<QuizValue>();
	let lastRun = $state('');

	const quick: QuizItem[] = [
		{ prompt: 'How many planets orbit the Sun?', choices: ['7', '8', '9'], answer: 1, why: 'Pluto was reclassified as a dwarf planet in 2006.' },
		{ prompt: 'Which planet is closest to the Sun?', choices: ['Venus', 'Mercury', 'Mars'], answer: 1 },
		{ prompt: 'What is a light year?', choices: ['A unit of time', 'A unit of distance', 'A unit of brightness'], answer: 1, why: 'The distance light travels in a year, about 9.5 trillion km.' }
	];

	const photos: QuizItem[] = [
		{
			prompt: 'Which planet is this?',
			choices: ['Saturn', 'Jupiter', 'Neptune'],
			answer: 0,
			image: 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=800',
			why: 'Saturn\'s rings are mostly ice, some pieces as big as a house.'
		},
		{
			prompt: 'Which planet is called the red planet?',
			choices: ['Venus', 'Mars', 'Mercury'],
			answer: 1,
			image: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800',
			why: 'Iron oxide dust gives Mars its colour.'
		},
		{ prompt: 'What do we call a rock that reaches the ground from space?', choices: ['Meteor', 'Meteorite', 'Comet'], answer: 1, why: 'A meteor is the streak of light; what lands is a meteorite.' }
	];
</script>

<svelte:head><title>Ripple · Quiz</title></svelte:head>

<div class="showcase">
	<header class="showcase-header">
		<h1>Quiz</h1>
		<p>
			"Quiz me on space. Eight questions, tell me why after each one, and give me a score at the end."
			Press 1 to 5 to answer and Enter for the next question.
		</p>
	</header>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Space trivia, full width</h2>
		<div class="pane">
			<Quiz
				title="Space trivia"
				topic="Astronomy"
				questions={space}
				bind:value={spaceValue}
				oncomplete={(r) => (lastRun = `${r.score} of ${r.total}`)}
			/>
		</div>
		<p class="section-caption">
			Bound <code>value</code>: {spaceValue ? JSON.stringify(spaceValue) : 'not set yet'}{lastRun ? ` · last on_complete: ${lastRun}` : ''}
		</p>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Timed and shuffled, 360px frame</h2>
		<p class="section-caption">15 seconds a question; running out counts as a miss. Retry deals a new choice order.</p>
		<div class="pane frame" style:width="360px">
			<Quiz title="Quick round" questions={quick} seconds_per_question={15} shuffle_choices />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">With photos</h2>
		<div class="pane">
			<Quiz title="Name that planet" topic="Solar system" questions={photos} />
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
