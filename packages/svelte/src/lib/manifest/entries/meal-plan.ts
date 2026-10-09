// manifest/entries/meal-plan.ts — the LLM-facing entry for the `meal-plan`
// data widget (design doc 2026-10-09 §3.6). The model writes the recipe
// library once and points days at it by id; the widget derives totals and the
// shopping list. `people` is the bound field; no events beyond the bind.
import type { WidgetManifestEntry } from '../index.js';

const AISLES = '"produce" | "protein" | "dairy" | "grains" | "pantry" | "frozen" | "other"';
const SLOTS = '"breakfast" | "lunch" | "dinner" | "snack"';

export const mealPlanEntry: WidgetManifestEntry = {
  type: 'meal-plan',
  category: 'composite',
  description:
    'Week of meals: recipes[{id, name, kind, serves, kcal, protein_g, ingredients}] once, days[{day, meals[{slot, recipe: id}]}], goal. Swaps meals, derives the shopping list. Bind people.',
  props: {
    title: { type: 'string', required: false, description: 'Plan name, e.g. "High-protein week".' },
    subtitle: { type: 'string', required: false, description: 'One line under the title.' },
    verdict: { type: '{ text: string; status?: "good" | "warn" | "bad" | "info" | "neutral" }', required: false, description: 'The answer up front, at most 140 chars.' },
    people: { type: 'number', required: true, description: 'People cooked for; scales the shopping list by people / serves. Two-way bind with `bind: "{state.people}"`.' },
    goal: { type: '{ kcal?: number; protein_g?: number }', required: false, description: 'Per person per day. Each day and the weekly average are shown against it.' },
    recipes: {
      type: `Array<{ id: string; name: string; kind?: ${SLOTS}; serves: number; minutes?: number; kcal?: number; protein_g?: number; tags?: string[]; ingredients: Array<{ name: string; qty?: number; unit?: string; note?: string; aisle?: ${AISLES} }>; steps?: Array<{ text: string; minutes?: number; tip?: string }> }>`,
      required: true,
      description:
        'The library, each recipe written ONCE. kcal and protein_g are PER SERVING; qty is a number with a separate unit. Include extra recipes per kind so meals can be swapped.',
    },
    days: {
      type: `Array<{ id?: string; day: string; meals: Array<{ id?: string; slot: ${SLOTS}; recipe: string }> }>`,
      required: true,
      description: '`day` is a display label ("Mon"). `recipe` is a recipe id from `recipes`. Swapping a meal writes a new days array.',
    },
  },
  example: {
    type: 'meal-plan',
    bind: '{state.people}',
    props: {
      title: 'High-protein week',
      people: 2,
      goal: { protein_g: 130, kcal: 2100 },
      recipes: [
        { id: 'oats', name: 'Protein overnight oats', kind: 'breakfast', serves: 1, kcal: 480, protein_g: 35, ingredients: [{ name: 'rolled oats', qty: 0.5, unit: 'cup', aisle: 'grains' }, { name: 'Greek yogurt', qty: 0.75, unit: 'cup', aisle: 'dairy' }] },
        { id: 'eggs', name: 'Spinach egg scramble', kind: 'breakfast', serves: 1, kcal: 420, protein_g: 32, ingredients: [{ name: 'eggs', qty: 4, aisle: 'dairy' }, { name: 'baby spinach', qty: 2, unit: 'cup', aisle: 'produce' }] },
        { id: 'chicken-bowl', name: 'Chicken rice bowl', kind: 'lunch', serves: 2, kcal: 640, protein_g: 52, ingredients: [{ name: 'chicken breast', qty: 500, unit: 'g', aisle: 'protein' }, { name: 'jasmine rice', qty: 1, unit: 'cup', aisle: 'grains' }] },
        { id: 'salmon', name: 'Salmon, quinoa and greens', kind: 'dinner', serves: 2, kcal: 690, protein_g: 48, ingredients: [{ name: 'salmon fillet', qty: 400, unit: 'g', aisle: 'protein' }, { name: 'quinoa', qty: 0.75, unit: 'cup', aisle: 'grains' }] },
        { id: 'chili', name: 'Turkey bean chili', kind: 'dinner', serves: 4, kcal: 560, protein_g: 46, ingredients: [{ name: 'ground turkey', qty: 500, unit: 'g', aisle: 'protein' }, { name: 'black beans', qty: 2, unit: 'can', aisle: 'pantry' }] },
      ],
      days: [
        { day: 'Mon', meals: [{ slot: 'breakfast', recipe: 'oats' }, { slot: 'lunch', recipe: 'chicken-bowl' }, { slot: 'dinner', recipe: 'salmon' }] },
        { day: 'Tue', meals: [{ slot: 'breakfast', recipe: 'eggs' }, { slot: 'lunch', recipe: 'chicken-bowl' }, { slot: 'dinner', recipe: 'chili' }] },
      ],
    },
  },
};
