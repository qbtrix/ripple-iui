// widgets/composite/Recipe.test.ts — the recipe data widget and the shared
// recipe.ts rules: registry and bind-contract wiring, a bound servings change
// writing back to state and rescaling numeric quantities ("1 1/2 cups" is
// 1.5 with a unit, so it scales), quantity formatting, ticking steps and
// ingredients, streamed parity with id-less items, and junk props.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget, hasWidget } from '../index.js';
import { _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import Recipe from './Recipe.svelte';
import { formatQty, qtyLabel, readIngredients, readSteps, scaleFactor, type Ingredient, type RecipeStep } from './recipe.js';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const ingredients = (): Ingredient[] => [
	{ id: 'pasta', name: 'rigatoni', qty: 400, unit: 'g', aisle: 'grains' },
	{ id: 'ricotta', name: 'ricotta', qty: 1.5, unit: 'cups', aisle: 'dairy' },
	{ id: 'parm', name: 'parmesan', qty: 0.75, unit: 'cup', note: 'finely grated', aisle: 'dairy' },
	{ id: 'lemon', name: 'lemon', qty: 1, aisle: 'produce' },
	{ id: 'pepper', name: 'black pepper', unit: 'to taste', aisle: 'pantry' }
];
const steps = (): RecipeStep[] => [
	{ text: 'Boil the rigatoni until just al dente.', minutes: 11, tip: 'Save a mug of pasta water.' },
	{ text: 'Whisk ricotta, lemon and parmesan.', minutes: 3 },
	{ text: 'Toss together, loosening with pasta water.' }
];
const qtys = (c: Element) => [...c.querySelectorAll('[data-slot="qty"]')].map((e) => e.textContent);

describe('recipe: registry and bind contract', () => {
	it('resolves the type and its alias to one component', () => {
		for (const t of ['recipe', 'recipe-card']) expect(hasWidget(t)).toBe(true);
		expect(getWidget('recipe-card')).toBe(getWidget('recipe'));
	});

	it('binds servings through onservingschange, without the unregistered warning', () => {
		expect(getBindContract('recipe')).toEqual({ prop: 'servings', event: 'onservingschange' });
		expect(getBindContract('recipe-card')).toEqual(getBindContract('recipe'));
		_resetBindContractWarnings();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		warnUnregisteredBindContract('recipe');
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('recipe: bound servings', () => {
	it('a stepper press writes servings to state and rescales the quantities', async () => {
		const onStateChange = vi.fn();
		const { container } = render(Ripple, {
			props: {
				spec: { state: { servings: 4 }, ui: { type: 'recipe', bind: '{state.servings}', props: { name: 'Lemon ricotta pasta', serves: 4, ingredients: ingredients() } } },
				onStateChange
			}
		});
		expect(qtys(container)).toEqual(['400 g', '1½ cups', '¾ cup', '1', 'to taste']);

		await fireEvent.click(screen.getByRole('button', { name: 'More servings' }));
		await fireEvent.click(screen.getByRole('button', { name: 'More servings' }));
		expect(onStateChange).toHaveBeenLastCalledWith('servings', 6, expect.anything());
		// ×1.5: 600 g, 2¼ cups, 1⅛ cup, 1½ lemons; "to taste" stays as written.
		expect(qtys(container)).toEqual(['600 g', '2¼ cups', '1⅛ cup', '1½', 'to taste']);

		await fireEvent.click(screen.getByRole('button', { name: /Written for 4/ }));
		expect(onStateChange).toHaveBeenLastCalledWith('servings', 4, expect.anything());
		expect(qtys(container)[1]).toBe('1½ cups');
	});

	it('a Svelte parent hears the new count, and the bound value drives the scale', async () => {
		const seen: number[] = [];
		const { container, rerender } = render(Recipe, {
			props: { name: 'Pancakes', serves: 2, servings: 2, ingredients: [{ name: 'flour', qty: 1.5, unit: 'cups' }], onservingschange: (n: number) => seen.push(n) }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Fewer servings' }));
		expect(seen).toEqual([1]);
		expect(qtys(container)).toEqual(['¾ cups']);
		await rerender({ servings: 4 });
		expect(qtys(container)).toEqual(['3 cups']);
	});

	it('without a usable serves, nothing scales and the stepper hides', () => {
		const { container } = render(Recipe, { props: { name: 'Toast', serves: 0, servings: 6, ingredients: [{ name: 'bread', qty: 2, unit: 'slices' }] } });
		expect(qtys(container)).toEqual(['2 slices']);
		expect(screen.queryByRole('button', { name: 'More servings' })).toBeNull();
	});
});

describe('recipe: ticks', () => {
	it('ticks steps into a new done array and ingredients locally', async () => {
		const seen: number[][] = [];
		render(Recipe, { props: { name: 'Pasta', serves: 4, ingredients: ingredients(), steps: steps(), ondonechange: (d: number[]) => seen.push(d) } });
		await fireEvent.click(screen.getByRole('checkbox', { name: 'Step 2' }));
		await fireEvent.click(screen.getByRole('checkbox', { name: 'Step 1' }));
		expect(seen.at(-1)).toEqual([0, 1]);
		expect(screen.getByText('2 of 3 done')).toBeTruthy();
		await fireEvent.click(screen.getByRole('checkbox', { name: 'Step 2' }));
		expect(seen.at(-1)).toEqual([0]);

		const box = screen.getByRole('checkbox', { name: /ricotta/ });
		await fireEvent.click(box);
		expect(box.getAttribute('aria-checked')).toBe('true');
		expect(screen.getByText('1 of 5')).toBeTruthy();
	});

	it('shows step timers, tips, the summed time and protein against the goal', () => {
		const { container } = render(Recipe, {
			props: { name: 'Pasta', serves: 4, kcal: 610, protein_g: 28, goal: { protein_g: 140 }, ingredients: ingredients(), steps: steps() }
		});
		expect(screen.getByText('Save a mug of pasta water.')).toBeTruthy();
		expect(container.querySelector('[data-slot="meta"]')!.textContent).toContain('14m');
		expect(container.querySelector('[data-slot="goal-share"]')!.textContent).toContain('20% of the 140 g');
	});
});

describe('recipe: streaming', () => {
	it('streams with id-less and field-less items and ends equal to the whole render', async () => {
		await expectStreamParity({
			state: { servings: 3 },
			ui: {
				type: 'recipe',
				bind: '{state.servings}',
				props: {
					name: 'Miso salmon traybake',
					verdict: { text: 'High protein and done in 30 minutes.', status: 'good' },
					kind: 'dinner',
					serves: 2,
					kcal: 540,
					protein_g: 41,
					tags: ['one tray', 'gluten free'],
					ingredients: [{ name: 'salmon fillets', qty: 2 }, {}, { name: 'white miso', qty: 1.5, unit: 'tbsp' }, { qty: 3 }, { name: 'broccolini', qty: 200, unit: 'g' }],
					steps: [{ text: 'Heat the oven to 220C.', minutes: 10 }, {}, 'Roast everything for 15 minutes.', { text: 'Glaze and serve.', tip: 'Broil for the last minute.' }]
				}
			}
		});
	});
});

describe('recipe: junk props', () => {
	it.each([
		['wrong types everywhere', { name: 7, serves: 'four', servings: 'x', ingredients: 'flour, eggs', steps: { a: 1 }, tags: 'quick', kcal: 'lots', difficulty: 'expert', done: 'all' }],
		['junk rows', { serves: 2, ingredients: [null, 3, 'salt', { name: { x: 1 } }, { name: 'Ok', qty: 'NaN', unit: 5 }], steps: [null, 4, { text: '' }, { text: 'Stir', minutes: -2 }] }],
		['nothing at all', {}]
	])('%s renders without throwing', (_name, props) => {
		const { container } = render(Recipe, { props: props as never });
		expect(container.querySelector('[data-widget="recipe"]')).not.toBeNull();
	});

	it('shows the empty line when there are no ingredients', () => {
		render(Recipe, { props: { name: 'Mystery stew' } });
		expect(screen.getByText('No ingredients yet. Ask for the full recipe.')).toBeTruthy();
	});

	it('never renders a refused photo', () => {
		const { container } = render(Recipe, { props: { name: 'X', image: 'javascript:alert(1)' } });
		expect(container.querySelector('img')).toBeNull();
	});

});

describe('recipe.ts: scaling and formatting', () => {
	it('scaleFactor is servings / serves, and 1 when either is unusable', () => {
		expect(scaleFactor(6, 4)).toBe(1.5);
		expect(scaleFactor(2, 4)).toBe(0.5);
		expect([scaleFactor(6, undefined), scaleFactor(6, 0), scaleFactor(6, -2), scaleFactor(undefined, 4), scaleFactor('x', 4)]).toEqual([1, 1, 1, 1, 1]);
	});

	it('formats quantities the way cooks write them', () => {
		expect(formatQty(1.5, 'cups')).toBe('1½');
		expect(formatQty(1.5 * 3, 'cups')).toBe('4½');
		expect(formatQty(1 / 3, 'tsp')).toBe('⅓');
		expect(formatQty(2 / 3)).toBe('⅔');
		expect(formatQty(0.75 * 1.5, 'cup')).toBe('1⅛');
		expect(formatQty(0.1 + 0.1, 'tbsp')).toBe('0.2');
		expect(formatQty(2.999)).toBe('3');
		expect(formatQty(562.5, 'g')).toBe('563');
		expect(formatQty(1.25, 'kg')).toBe('1.25');
		expect(formatQty(24.4)).toBe('24');
		expect([formatQty(undefined), formatQty(Number.NaN), formatQty(-1), formatQty('lots')]).toEqual(['', '', '', '']);
		expect(qtyLabel(2, '')).toBe('2');
		expect(qtyLabel(undefined, 'to taste')).toBe('to taste');
	});

	it('reads rows without names as gaps but keeps step positions', () => {
		expect(readIngredients([{ name: 'a' }, {}, null, { name: '**b**', qty: '2' }]).map((r) => [r.key, r.name, r.qty])).toEqual([
			[':0', 'a', undefined],
			[':3', 'b', 2]
		]);
		expect(readSteps(['one', {}, { text: 'three', minutes: 0 }]).map((s) => [s.i, s.text, s.minutes])).toEqual([
			[0, 'one', undefined],
			[2, 'three', undefined]
		]);
	});
});
