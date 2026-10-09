// widgets/composite/Recipe.ssr.test.ts — `recipe` and `meal-plan` render
// through svelte/server: the showcase routes are prerendered and a chat card
// can be server-rendered, so neither widget may need window at render time.
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Recipe from './Recipe.svelte';
import MealPlan from './MealPlan.svelte';

const chili = {
	id: 'chili',
	name: 'Turkey chili',
	kind: 'dinner' as const,
	serves: 4,
	kcal: 560,
	protein_g: 46,
	ingredients: [{ name: 'ground turkey', qty: 500, unit: 'g', aisle: 'protein' as const }, { name: 'crushed tomatoes', qty: 1.5, unit: 'cans' }],
	steps: [{ text: 'Brown the turkey.', minutes: 8 }]
};

describe('recipe and meal-plan SSR', () => {
	it('renders a recipe scaled to the bound servings', () => {
		const { body } = render(Recipe, { props: { ...chili, servings: 8 } });
		expect(body).toContain('Turkey chili');
		expect(body).toContain('1,000 g');
		expect(body).toContain('3 cans');
	});

	it('renders the week and the shopping list', () => {
		const { body } = render(MealPlan, {
			props: { people: 2, goal: { protein_g: 80 }, recipes: [chili], days: [{ day: 'Mon', meals: [{ slot: 'dinner', recipe: 'chili' }] }] }
		});
		expect(body).toContain('Turkey chili');
		expect(body).toContain('250 g');
		expect(body).toContain('data-day="Mon"');
	});
});
