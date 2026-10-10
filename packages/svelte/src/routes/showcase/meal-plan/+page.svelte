<!--
  routes/showcase/meal-plan/+page.svelte — dev preview of the meal-plan data
  widget for screenshots and visual QA, after the landing's demo prompt ("a
  high-protein meal plan for the week; let me swap meals, set how many people
  I'm cooking for, and keep a shopping list"): a 7-day week for 2 at full
  width (the days-by-slots grid at 720px+) and a 3-day plan in a 360px frame
  (drag the corner). Both bind `people`, `days` and `got`, so swaps, the
  people count and shopping ticks show in the readouts. Linked from the /showcase gallery. Fictional dishes only: the site is public.
-->
<script lang="ts">
	import DetailHeader from '../DetailHeader.svelte';
	import MealPlan from '$lib/widgets/composite/MealPlan.svelte';
	import type { PlanDay, RecipeData } from '$lib/widgets/composite/recipe.js';

	const recipes: RecipeData[] = [
		{
			id: 'oats',
			name: 'Protein overnight oats',
			kind: 'breakfast',
			serves: 1,
			minutes: 5,
			kcal: 470,
			protein_g: 36,
			tags: ['make ahead'],
			ingredients: [
				{ name: 'rolled oats', qty: 0.5, unit: 'cup', aisle: 'grains' },
				{ name: 'Greek yogurt', qty: 0.75, unit: 'cup', aisle: 'dairy' },
				{ name: 'milk', qty: 0.5, unit: 'cup', aisle: 'dairy' },
				{ name: 'chia seeds', qty: 1, unit: 'tbsp', aisle: 'pantry' },
				{ name: 'blueberries', qty: 0.5, unit: 'cup', aisle: 'frozen' }
			],
			steps: [
				{ text: 'Stir the oats, yogurt, milk and chia together in a jar.', minutes: 3 },
				{ text: 'Top with the berries, close the lid and chill overnight.', tip: 'Keeps for three days, so make a few at once.' }
			]
		},
		{
			id: 'scramble',
			name: 'Spinach and feta scramble',
			kind: 'breakfast',
			serves: 1,
			minutes: 10,
			kcal: 430,
			protein_g: 33,
			ingredients: [
				{ name: 'eggs', qty: 3, aisle: 'dairy' },
				{ name: 'egg whites', qty: 0.5, unit: 'cup', aisle: 'dairy' },
				{ name: 'baby spinach', qty: 2, unit: 'cups', aisle: 'produce' },
				{ name: 'feta', qty: 30, unit: 'g', aisle: 'dairy' },
				{ name: 'wholegrain toast', qty: 1, unit: 'slice', aisle: 'grains' }
			]
		},
		{
			id: 'pancakes',
			name: 'Cottage cheese pancakes',
			kind: 'breakfast',
			serves: 2,
			minutes: 20,
			kcal: 410,
			protein_g: 31,
			ingredients: [
				{ name: 'cottage cheese', qty: 1, unit: 'cup', aisle: 'dairy' },
				{ name: 'eggs', qty: 4, aisle: 'dairy' },
				{ name: 'rolled oats', qty: 0.75, unit: 'cup', aisle: 'grains' },
				{ name: 'banana', qty: 1, aisle: 'produce' }
			]
		},
		{
			id: 'chicken-bowl',
			name: 'Chicken, rice and greens bowl',
			kind: 'lunch',
			serves: 2,
			minutes: 25,
			kcal: 640,
			protein_g: 52,
			ingredients: [
				{ name: 'chicken breast', qty: 500, unit: 'g', aisle: 'protein' },
				{ name: 'jasmine rice', qty: 1, unit: 'cup', aisle: 'grains' },
				{ name: 'broccoli', qty: 1, unit: 'head', aisle: 'produce' },
				{ name: 'soy sauce', qty: 2, unit: 'tbsp', aisle: 'pantry' },
				{ name: 'sesame seeds', qty: 1, unit: 'tsp', aisle: 'pantry' }
			],
			steps: [
				{ text: 'Rinse the rice and simmer it covered.', minutes: 15 },
				{ text: 'Slice and sear the chicken in a hot pan until golden and cooked through.', minutes: 8, tip: 'Pat it dry first or it steams instead of browning.' },
				{ text: 'Steam the broccoli for the last 4 minutes, then build the bowls and finish with soy and sesame.', minutes: 4 }
			]
		},
		{
			id: 'tuna-salad',
			name: 'Tuna and white bean salad',
			kind: 'lunch',
			serves: 2,
			minutes: 10,
			kcal: 520,
			protein_g: 44,
			ingredients: [
				{ name: 'tuna in olive oil', qty: 2, unit: 'cans', aisle: 'protein' },
				{ name: 'cannellini beans', qty: 1, unit: 'can', aisle: 'pantry' },
				{ name: 'cherry tomatoes', qty: 1.5, unit: 'cups', aisle: 'produce' },
				{ name: 'red onion', qty: 0.5, aisle: 'produce' }
			]
		},
		{
			id: 'turkey-wraps',
			name: 'Turkey lettuce wraps',
			kind: 'lunch',
			serves: 2,
			minutes: 15,
			kcal: 480,
			protein_g: 47,
			ingredients: [
				{ name: 'ground turkey', qty: 450, unit: 'g', aisle: 'protein' },
				{ name: 'butter lettuce', qty: 1, unit: 'head', aisle: 'produce' },
				{ name: 'water chestnuts', qty: 1, unit: 'can', aisle: 'pantry' },
				{ name: 'hoisin sauce', qty: 3, unit: 'tbsp', aisle: 'pantry' }
			]
		},
		{
			id: 'salmon',
			name: 'Salmon, quinoa and charred greens',
			kind: 'dinner',
			serves: 2,
			minutes: 25,
			kcal: 690,
			protein_g: 48,
			ingredients: [
				{ name: 'salmon fillets', qty: 400, unit: 'g', aisle: 'protein' },
				{ name: 'quinoa', qty: 0.75, unit: 'cup', aisle: 'grains' },
				{ name: 'green beans', qty: 250, unit: 'g', aisle: 'produce' },
				{ name: 'lemon', qty: 1, aisle: 'produce' }
			],
			steps: [
				{ text: 'Simmer the quinoa in 1½ cups of salted water until the water is gone.', minutes: 15 },
				{ text: 'Roast the salmon and green beans on one tray at 220°C.', minutes: 12, tip: 'Pull the salmon when the thickest part just flakes.' }
			]
		},
		{
			id: 'chili',
			name: 'Turkey and black bean chili',
			kind: 'dinner',
			serves: 4,
			minutes: 40,
			kcal: 560,
			protein_g: 46,
			tags: ['batch cook'],
			ingredients: [
				{ name: 'ground turkey', qty: 500, unit: 'g', aisle: 'protein' },
				{ name: 'black beans', qty: 2, unit: 'cans', aisle: 'pantry' },
				{ name: 'crushed tomatoes', qty: 1, unit: 'can', aisle: 'pantry' },
				{ name: 'onion', qty: 1, aisle: 'produce' },
				{ name: 'chili powder', qty: 1.5, unit: 'tbsp', aisle: 'pantry' }
			]
		},
		{
			id: 'tofu',
			name: 'Crispy tofu and edamame stir-fry',
			kind: 'dinner',
			serves: 2,
			minutes: 25,
			kcal: 590,
			protein_g: 41,
			tags: ['vegetarian'],
			ingredients: [
				{ name: 'extra-firm tofu', qty: 400, unit: 'g', aisle: 'protein' },
				{ name: 'shelled edamame', qty: 1, unit: 'cup', aisle: 'frozen' },
				{ name: 'bell peppers', qty: 2, aisle: 'produce' },
				{ name: 'soy sauce', qty: 3, unit: 'tbsp', aisle: 'pantry' },
				{ name: 'brown rice', qty: 0.75, unit: 'cup', aisle: 'grains' }
			]
		},
		{
			id: 'steak',
			name: 'Sirloin, potatoes and slaw',
			kind: 'dinner',
			serves: 2,
			minutes: 35,
			kcal: 720,
			protein_g: 54,
			ingredients: [
				{ name: 'sirloin steak', qty: 450, unit: 'g', aisle: 'protein' },
				{ name: 'baby potatoes', qty: 500, unit: 'g', aisle: 'produce' },
				{ name: 'red cabbage', qty: 0.25, unit: 'head', aisle: 'produce' },
				{ name: 'Greek yogurt', qty: 0.25, unit: 'cup', aisle: 'dairy' }
			]
		},
		{
			id: 'yogurt-bowl',
			name: 'Yogurt, berries and almonds',
			kind: 'snack',
			serves: 1,
			minutes: 2,
			kcal: 260,
			protein_g: 22,
			ingredients: [
				{ name: 'Greek yogurt', qty: 0.75, unit: 'cup', aisle: 'dairy' },
				{ name: 'blueberries', qty: 0.5, unit: 'cup', aisle: 'frozen' },
				{ name: 'almonds', qty: 2, unit: 'tbsp', aisle: 'pantry' }
			]
		},
		{
			id: 'edamame',
			name: 'Salted edamame',
			kind: 'snack',
			serves: 1,
			minutes: 5,
			kcal: 190,
			protein_g: 17,
			ingredients: [{ name: 'shelled edamame', qty: 1, unit: 'cup', aisle: 'frozen' }]
		}
	];

	const day = (d: string, b: string, l: string, dn: string, s: string): PlanDay => ({
		day: d,
		meals: [
			{ slot: 'breakfast', recipe: b },
			{ slot: 'lunch', recipe: l },
			{ slot: 'dinner', recipe: dn },
			{ slot: 'snack', recipe: s }
		]
	});

	let people = $state(2);
	let got = $state<string[]>([]);
	let days = $state<PlanDay[]>([
		day('Mon', 'oats', 'chicken-bowl', 'salmon', 'yogurt-bowl'),
		day('Tue', 'scramble', 'tuna-salad', 'chili', 'edamame'),
		day('Wed', 'oats', 'chicken-bowl', 'tofu', 'yogurt-bowl'),
		day('Thu', 'pancakes', 'turkey-wraps', 'chili', 'edamame'),
		day('Fri', 'oats', 'tuna-salad', 'steak', 'yogurt-bowl'),
		day('Sat', 'pancakes', 'turkey-wraps', 'salmon', 'edamame'),
		day('Sun', 'scramble', 'chicken-bowl', 'tofu', 'yogurt-bowl')
	]);

	let solo = $state(1);
	let soloDays = $state<PlanDay[]>([
		{ day: 'Mon', meals: [{ slot: 'breakfast', recipe: 'oats' }, { slot: 'lunch', recipe: 'tuna-salad' }, { slot: 'dinner', recipe: 'chili' }] },
		{ day: 'Tue', meals: [{ slot: 'breakfast', recipe: 'scramble' }, { slot: 'lunch', recipe: 'chili' }, { slot: 'dinner', recipe: 'tofu' }] },
		{ day: 'Wed', meals: [{ slot: 'breakfast', recipe: 'oats' }, { slot: 'dinner', recipe: 'steak' }] }
	]);
</script>

<svelte:head><title>Ripple · Meal plan</title></svelte:head>

<div class="showcase">
	<DetailHeader id="meal-plan">Swap a meal with the arrows, change the people count, tap a meal to open its recipe, tick the shopping list. All three are bound, so the readouts show what the widget emits.</DetailHeader>

	<section class="showcase-section">
		<h2 class="showcase-section-title">High-protein week for 2, full width</h2>
		<div data-thumb class="pane">
			<MealPlan
				title="High-protein week"
				subtitle="4 meals a day, 140 g protein each"
				verdict={{ text: 'Every day clears 140 g protein; Tuesday sits closest to the line.', status: 'good' }}
				goal={{ protein_g: 140, kcal: 1900 }}
				{recipes}
				bind:people
				bind:days
				bind:got
			/>
		</div>
		<p class="section-caption">Bound people: {people} · ticked: {got.length} · Mon dinner: {days[0]?.meals[2]?.recipe}</p>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Three days for one, 360px frame</h2>
		<p class="section-caption">Drag the frame's corner. Below 720px each day is a card; Wednesday has no lunch or snack, and the goal names calories only.</p>
		<div class="pane frame" style:width="360px">
			<MealPlan title="Cut, week 1" goal={{ kcal: 1700 }} {recipes} bind:people={solo} bind:days={soloDays} />
		</div>
		<details class="readout">
			<summary>Bound <code>days</code> (three days)</summary>
			<pre>{JSON.stringify(soloDays, null, 2)}</pre>
		</details>
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
	.readout {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}
	.readout pre {
		max-height: 320px;
		overflow: auto;
		padding: 0.75rem;
		border-radius: 0.5rem;
		background: var(--muted);
	}
</style>
