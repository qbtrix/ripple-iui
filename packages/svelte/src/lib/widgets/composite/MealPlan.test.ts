// widgets/composite/MealPlan.test.ts — the meal-plan data widget: registry and
// bind-contract wiring, a bound people change rescaling the shopping list,
// swaps writing a new days array (and surviving a later people change),
// shopping ticks, the inline RecipeView, streamed parity with id-less and
// half-written items, junk props, and the sums in recipe.ts (shopping list,
// day totals, goal checks).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget, hasWidget } from '../index.js';
import { _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import MealPlan from './MealPlan.svelte';
import { dayTotals, goalCheck, holds, nextEdit, readLibrary, shoppingList, swapMeal, type PlanDay, type RecipeData } from './recipe.js';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const recipes = (): RecipeData[] => [
	{
		id: 'oats',
		name: 'Protein oats',
		kind: 'breakfast',
		serves: 1,
		kcal: 450,
		protein_g: 35,
		ingredients: [
			{ name: 'rolled oats', qty: 0.5, unit: 'cup', aisle: 'grains' },
			{ name: 'Greek yogurt', qty: 0.75, unit: 'cup', aisle: 'dairy' }
		]
	},
	{
		id: 'eggs',
		name: 'Egg scramble',
		kind: 'breakfast',
		serves: 1,
		kcal: 400,
		protein_g: 30,
		ingredients: [
			{ name: 'eggs', qty: 3, aisle: 'dairy' },
			{ name: 'Greek yogurt', qty: 0.25, unit: 'cup', aisle: 'dairy' }
		]
	},
	{
		id: 'chili',
		name: 'Turkey chili',
		kind: 'dinner',
		serves: 4,
		kcal: 560,
		protein_g: 46,
		ingredients: [
			{ name: 'ground turkey', qty: 500, unit: 'g', aisle: 'protein' },
			{ name: 'black beans', qty: 2, unit: 'can', aisle: 'pantry' },
			{ name: 'chili powder', unit: 'to taste', aisle: 'pantry' }
		],
		steps: [{ text: 'Brown the turkey.', minutes: 8 }]
	},
	{
		id: 'salmon',
		name: 'Salmon bowl',
		kind: 'dinner',
		serves: 2,
		kcal: 690,
		protein_g: 48,
		ingredients: [{ name: 'salmon fillet', qty: 400, unit: 'g', aisle: 'protein' }]
	}
];
const week = (): PlanDay[] => [
	{ id: 'mon', day: 'Mon', meals: [{ slot: 'breakfast', recipe: 'oats' }, { slot: 'dinner', recipe: 'chili' }] },
	{ id: 'tue', day: 'Tue', meals: [{ slot: 'breakfast', recipe: 'oats' }, { slot: 'dinner', recipe: 'salmon' }] }
];
const amount = (c: Element, key: string) => c.querySelector(`[data-item="${key}"] [data-slot="amount"]`)?.textContent?.trim();

describe('meal-plan: registry and bind contract', () => {
	it('resolves the type and both aliases to one component', () => {
		for (const t of ['meal-plan', 'meal-planner', 'weekly-meal-plan']) expect(hasWidget(t)).toBe(true);
		expect(getWidget('meal-planner')).toBe(getWidget('meal-plan'));
		expect(getWidget('weekly-meal-plan')).toBe(getWidget('meal-plan'));
	});

	it('binds people through onpeoplechange, for every alias, without the unregistered warning', () => {
		expect(getBindContract('meal-plan')).toEqual({ prop: 'people', event: 'onpeoplechange' });
		expect(getBindContract('meal-planner')).toEqual(getBindContract('meal-plan'));
		expect(getBindContract('weekly-meal-plan')).toEqual(getBindContract('meal-plan'));
		_resetBindContractWarnings();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		warnUnregisteredBindContract('meal-plan');
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('meal-plan: bound edits', () => {
	const mountBound = () => {
		const onStateChange = vi.fn();
		const view = render(Ripple, {
			props: {
				spec: { state: { people: 2 }, ui: { type: 'meal-plan', bind: '{state.people}', props: { goal: { protein_g: 80 }, recipes: recipes(), days: week() } } },
				onStateChange
			}
		});
		return { ...view, onStateChange };
	};

	it('a people press writes to state and rescales the shopping list', async () => {
		const { container, onStateChange } = mountBound();
		// 500 g turkey serves 4, cooked once for 2 → 250 g; oats twice for 2 → 2 cups.
		expect(amount(container, 'ground turkey|g')).toBe('250 g');
		expect(amount(container, 'rolled oats|cup')).toBe('2 cup');
		await fireEvent.click(screen.getByRole('button', { name: 'More people' }));
		expect(onStateChange).toHaveBeenLastCalledWith('people', 3, expect.anything());
		expect(amount(container, 'ground turkey|g')).toBe('375 g');
		expect(amount(container, 'rolled oats|cup')).toBe('3 cup');
	});

	it('a swap rewrites the list, and survives a later people change', async () => {
		const { container } = mountBound();
		const select = screen.getByRole('combobox', { name: 'Swap Mon Breakfast' }) as HTMLSelectElement;
		await fireEvent.change(select, { target: { value: 'eggs' } });
		expect(container.querySelector('[data-day="Mon"] [data-meal="eggs"]')).not.toBeNull();
		expect(amount(container, 'eggs|')).toBe('6');
		// yogurt: Tue oats 0.75 + Mon eggs 0.25 = 1 cup, times 2 people
		expect(amount(container, 'greek yogurt|cup')).toBe('2 cup');

		const yogurt = () => screen.getByRole('checkbox', { name: /Greek yogurt/ });
		await fireEvent.click(yogurt());

		await fireEvent.click(screen.getByRole('button', { name: 'More people' }));
		expect(container.querySelector('[data-day="Mon"] [data-meal="eggs"]')).not.toBeNull();
		expect(amount(container, 'eggs|')).toBe('9');
		expect(yogurt().getAttribute('aria-checked')).toBe('true');
	});

	it('a Svelte parent sees the swapped days and the ticked items', async () => {
		let days: PlanDay[] = [];
		let got: string[] = [];
		render(MealPlan, {
			props: { people: 2, recipes: recipes(), days: week(), ondayschange: (d: PlanDay[]) => (days = d), ongotchange: (g: string[]) => (got = g) }
		});
		await fireEvent.change(screen.getByRole('combobox', { name: 'Swap Tue Dinner' }), { target: { value: 'chili' } });
		expect(days.map((d) => d.meals.map((m) => m.recipe))).toEqual([
			['oats', 'chili'],
			['oats', 'chili']
		]);
		expect(days[0]).toEqual(week()[0]);

		await fireEvent.click(screen.getByRole('checkbox', { name: /ground turkey/ }));
		expect(got).toEqual(['ground turkey|g']);
		expect(screen.getByText('1 of 5 got')).toBeTruthy();
	});

	it('opens a meal as its recipe, scaled to the people count', async () => {
		const { container } = render(MealPlan, { props: { people: 2, recipes: recipes(), days: week() } });
		expect(container.querySelector('[data-widget="recipe"]')).toBeNull();
		const meal = container.querySelector('[data-day="Mon"] [data-meal="chili"] button')!;
		await fireEvent.click(meal);
		const view = container.querySelector('[data-widget="recipe"]')!;
		expect(view.querySelector('h3')!.textContent).toBe('Turkey chili');
		expect(view.querySelector('[data-slot="qty"]')!.textContent).toBe('250 g');
		await fireEvent.click(screen.getByRole('button', { name: 'Close Turkey chili' }));
		expect(container.querySelector('[data-widget="recipe"]')).toBeNull();
	});
});

describe('meal-plan: streaming', () => {
	it('streams with id-less and half-written items and ends equal to the whole render', async () => {
		await expectStreamParity({
			state: { people: 2 },
			ui: {
				type: 'meal-plan',
				bind: '{state.people}',
				props: {
					title: 'High-protein week',
					verdict: { text: 'Every day clears 120 g protein.', status: 'good' },
					goal: { protein_g: 120, kcal: 2000 },
					days: [
						{ day: 'Mon', meals: [{ slot: 'breakfast', recipe: 'oats' }, {}, { slot: 'dinner', recipe: 'chili' }] },
						{},
						{ label: 'Wed', meals: [{ slot: 'lunch', recipe: 'Salmon bowl' }, { slot: 'snack' }] }
					],
					recipes: [...recipes().map(({ id: _id, ...r }, i) => (i === 1 ? r : { id: _id, ...r })), {}, { name: 'Trail mix', kind: 'snack', ingredients: [{ name: 'almonds' }] }]
				}
			}
		});
	});
});

describe('meal-plan: junk props', () => {
	it.each([
		['wrong types everywhere', { people: 'two', goal: 'lots', recipes: 'oats', days: { mon: 1 }, got: 'all' }],
		['junk rows', { recipes: [null, 3, { name: 'X', ingredients: 'flour' }], days: [null, 4, { day: 7, meals: 'oats' }, { meals: [null, { slot: 3, recipe: {} }] }] }],
		['nothing at all', {}]
	])('%s renders without throwing', (_name, props) => {
		const { container } = render(MealPlan, { props: props as never });
		expect(container.querySelector('[data-widget="meal-plan"]')).not.toBeNull();
	});

	it('reads a day written as label (the ocean-flow crash) and a day with no meals', () => {
		const { container } = render(MealPlan, { props: { recipes: recipes(), days: [{ label: 'Thu', meals: [{ slot: 'dinner', recipe: 'chili' }] }, { day: 'Fri' }] as never } });
		expect(container.querySelector('[data-day="Thu"]')).not.toBeNull();
		expect(screen.getByText('Nothing planned yet.')).toBeTruthy();
	});

	it('shows a skeleton row for a recipe that has not arrived', () => {
		const { container } = render(MealPlan, { props: { recipes: [], days: [{ day: 'Mon', meals: [{ slot: 'lunch', recipe: 'tuna-melt' }] }] } });
		expect(container.querySelector('[data-slot="meal-pending"]')!.textContent).toContain('tuna-melt');
		expect(screen.getByText('The list fills in as meals are planned.')).toBeTruthy();
	});

});

describe('recipe.ts: meal-plan sums', () => {
	const lib = readLibrary(recipes());

	it('sums each ingredient by name and unit, times people / serves, per use', () => {
		const list = shoppingList(week(), lib, 2);
		expect(list.map((g) => g.aisle)).toEqual(['protein', 'dairy', 'grains', 'pantry']);
		const flat = Object.fromEntries(list.flatMap((g) => g.items).map((i) => [i.key, [i.qty, i.uses]]));
		expect(flat).toEqual({
			'ground turkey|g': [250, 1],
			'salmon fillet|g': [400, 1],
			'greek yogurt|cup': [3, 2],
			'rolled oats|cup': [2, 2],
			'black beans|can': [1, 1],
			'chili powder|to taste': [undefined, 1]
		});
	});

	it('keeps units apart, normalises names, and guards serves, aisle and missing recipes', () => {
		const lib2 = readLibrary([
			{ id: 'a', name: 'A', serves: 2, ingredients: [{ name: 'Milk ', qty: 1, unit: 'cup', aisle: 'dairy' }, { name: 'milk', qty: 200, unit: 'ml' }] },
			{ id: 'b', name: 'B', ingredients: [{ name: 'milk', qty: 0.5, unit: 'Cup' }, { name: 'mystery', qty: 1, aisle: 'deli' }] },
			{ id: 'c', name: 'C', serves: Number.NaN, ingredients: [{ name: 'milk', qty: 'x', unit: 'cup' }] }
		]);
		const days = [{ meals: [{ recipe: 'a' }, { recipe: 'b' }, { recipe: 'c' }, { recipe: 'gone' }] }];
		const items = shoppingList(days, lib2, 4).flatMap((g) => g.items.map((i) => ({ ...i, g: g.aisle })));
		const by = (k: string) => items.find((i) => i.key === k)!;
		// A serves 2 for 4 people → ×2; B and C have no usable serves → as written.
		expect(by('milk|cup')).toMatchObject({ name: 'Milk', qty: 2.5, uses: 3, g: 'dairy' });
		expect(by('milk|ml')).toMatchObject({ qty: 400, g: 'other' });
		expect(by('mystery|')).toMatchObject({ qty: 1, g: 'other' });
		expect(items).toHaveLength(3);
	});

	it('totals a day per person and checks it against the goal', () => {
		expect(dayTotals(week()[0], lib)).toEqual({ kcal: 1010, protein: 81 });
		expect(dayTotals({ meals: [{ recipe: 'nope' }] }, lib)).toEqual({ kcal: undefined, protein: undefined });
		expect(dayTotals({ label: 'x' }, lib)).toEqual({ kcal: undefined, protein: undefined });
		expect([goalCheck(120, 120, 'floor'), goalCheck(105, 120, 'floor'), goalCheck(90, 120, 'floor')].map((c) => c?.word)).toEqual(['Goal met', 'Close', 'Short']);
		expect([goalCheck(2100, 2000, 'target'), goalCheck(2350, 2000, 'target'), goalCheck(2600, 2000, 'target'), goalCheck(1400, 2000, 'target')].map((c) => c?.word)).toEqual([
			'On target',
			'Close',
			'Over',
			'Under'
		]);
		expect(goalCheck(100, undefined, 'floor')).toBeUndefined();
		expect(goalCheck(undefined, 120, 'floor')).toBeUndefined();
	});

	it('an edit holds against its own value and a re-sent original, and yields to new data', () => {
		const original = week();
		const swapped = swapMeal(original, 0, 0, 'eggs');
		const edit = nextEdit(null, original, swapped);
		expect(holds(edit, swapped)).toBe(true);
		expect(holds(edit, week())).toBe(true);
		// a second edit stays anchored to the original
		const again = nextEdit(edit, swapped, swapMeal(swapped, 1, 0, 'eggs'));
		expect(holds(again, week())).toBe(true);
		expect(holds(again, [{ day: 'Sun', meals: [] }])).toBe(false);
		expect(holds(null, original)).toBe(false);
	});

	it('swapMeal returns a new days array and leaves the old one alone', () => {
		const before = week();
		const after = swapMeal(before, 1, 1, 'chili') as PlanDay[];
		expect(after[1].meals[1].recipe).toBe('chili');
		expect(before[1].meals[1].recipe).toBe('salmon');
		expect(after[0]).toBe(before[0]);
	});
});
