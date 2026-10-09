<!--
  routes/showcase/recipe/+page.svelte — dev preview of the recipe data widget
  for screenshots and visual QA: a pasta dish with fractional quantities
  (1½ cups, ¾ cup, ⅓ cup) at full width, and an ingredients-only dish in a
  360px frame (drag the corner to resize). Both bind `servings`, so the
  stepper rescales every numeric quantity and the readout shows the value.
  URL-only (not linked from the showcase index). Fictional dishes only: the
  site is public.
-->
<script lang="ts">
	import Recipe from '$lib/widgets/composite/Recipe.svelte';
	import type { Ingredient, RecipeStep } from '$lib/widgets/composite/recipe.js';

	let pastaServings = $state(4);
	let pastaDone = $state<number[]>([]);
	let saladServings = $state(2);

	const pastaIngredients: Ingredient[] = [
		{ name: 'rigatoni', qty: 400, unit: 'g', aisle: 'grains' },
		{ name: 'whole-milk ricotta', qty: 1.5, unit: 'cups', aisle: 'dairy' },
		{ name: 'parmesan', qty: 0.75, unit: 'cup', note: 'finely grated, plus more to serve', aisle: 'dairy' },
		{ name: 'lemons', qty: 2, note: 'zest of both, juice of one', aisle: 'produce' },
		{ name: 'baby spinach', qty: 3, unit: 'cups', aisle: 'produce' },
		{ name: 'toasted pine nuts', qty: 1 / 3, unit: 'cup', aisle: 'pantry' },
		{ name: 'olive oil', qty: 2, unit: 'tbsp', aisle: 'pantry' },
		{ name: 'garlic', qty: 1, unit: 'clove', note: 'grated', aisle: 'produce' },
		{ name: 'flaky salt and black pepper', unit: 'to taste', aisle: 'pantry' }
	];

	const pastaSteps: RecipeStep[] = [
		{ text: 'Bring a large pot of well-salted water to a boil and cook the rigatoni until just al dente.', minutes: 11, tip: 'Scoop out a mug of the starchy pasta water before you drain.' },
		{ text: 'While it cooks, whisk the ricotta, parmesan, lemon zest and juice, garlic, olive oil and plenty of pepper in a bowl big enough to toss the pasta.', minutes: 4 },
		{ text: 'Drain the pasta and tip it straight into the bowl with the spinach. Toss, adding pasta water a splash at a time until the sauce turns glossy and coats every tube.', minutes: 3, tip: 'The spinach wilts in the heat of the pasta; no pan needed.' },
		{ text: 'Finish with the pine nuts, more parmesan and a pinch of flaky salt.', minutes: 1 }
	];
</script>

<svelte:head><title>Ripple · Recipe</title></svelte:head>

<div class="showcase">
	<header class="showcase-header">
		<h1>Recipe</h1>
		<p>Step the servings and every numeric quantity rescales (1½ cups for 4 is 2¼ for 6). Tick ingredients as you gather them and steps as you cook. Toggle the theme in the top bar to check dark.</p>
	</header>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Lemon ricotta rigatoni, full width</h2>
		<div class="pane">
			<Recipe
				name="Lemon ricotta rigatoni"
				subtitle="Bright, creamy and on the table in 20 minutes"
				verdict={{ text: 'A fast vegetarian dinner with 27 g protein a serving.', status: 'good' }}
				kind="dinner"
				serves={4}
				kcal={610}
				protein_g={27}
				difficulty="easy"
				tags={['vegetarian', 'weeknight', 'one bowl']}
				goal={{ protein_g: 130 }}
				ingredients={pastaIngredients}
				steps={pastaSteps}
				bind:servings={pastaServings}
				bind:done={pastaDone}
			/>
		</div>
		<p class="section-caption">Bound servings: {pastaServings} · steps done: {pastaDone.length ? pastaDone.map((i) => i + 1).join(', ') : 'none'}</p>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">No-cook salad, 360px frame</h2>
		<p class="section-caption">Drag the frame's corner. No steps, so the ingredients take the full width; no photo, so the kind icon sits by the title.</p>
		<div class="pane frame" style:width="360px">
			<Recipe
				name="White bean, tuna and herb salad"
				kind="lunch"
				serves={2}
				minutes={10}
				kcal={480}
				protein_g={38}
				ingredients={[
					{ name: 'cannellini beans', qty: 1, unit: 'can', note: 'drained', aisle: 'pantry' },
					{ name: 'tuna in olive oil', qty: 1, unit: 'jar', aisle: 'protein' },
					{ name: 'red onion', qty: 0.25, note: 'thinly sliced', aisle: 'produce' },
					{ name: 'flat-leaf parsley', qty: 0.5, unit: 'cup', aisle: 'produce' },
					{ name: 'red wine vinegar', qty: 1.5, unit: 'tbsp', aisle: 'pantry' }
				]}
				bind:servings={saladServings}
			/>
		</div>
		<p class="section-caption">Bound servings: {saladServings}</p>
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
