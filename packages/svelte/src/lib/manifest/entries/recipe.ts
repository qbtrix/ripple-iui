// manifest/entries/recipe.ts — the LLM-facing entry for the `recipe` data
// widget (design doc 2026-10-09 §3.6). Quantities are numbers with a separate
// unit so the servings stepper can scale them; kcal and protein are per
// serving. `servings` is the bound field; no events beyond the bind.
import type { WidgetManifestEntry } from '../index.js';

const AISLES = '"produce" | "protein" | "dairy" | "grains" | "pantry" | "frozen" | "other"';

export const recipeEntry: WidgetManifestEntry = {
  type: 'recipe',
  category: 'composite',
  description:
    'One dish: name, serves, minutes, kcal + protein_g per serving, ingredients[{name, qty (number), unit, note}], steps[{text, minutes, tip}]. Bind servings to scale every qty.',
  props: {
    name: { type: 'string', required: true, description: 'Dish name, e.g. "Lemon ricotta pasta".' },
    subtitle: { type: 'string', required: false, description: 'One line under the name (cuisine, the hook).' },
    verdict: { type: '{ text: string; status?: "good" | "warn" | "bad" | "info" | "neutral" }', required: false, description: 'The answer up front, at most 140 chars.' },
    kind: { type: '"breakfast" | "lunch" | "dinner" | "snack"', required: false, description: 'Meal kind; picks the icon when there is no photo.' },
    image: { type: 'string', required: false, description: 'Photo URL from the host only; never invent one. Without it a kind icon shows.' },
    minutes: { type: 'number', required: false, description: 'Total time. Summed from step minutes when omitted.' },
    serves: { type: 'number', required: true, description: 'Servings the quantities are written for. Scaling multiplies qty by servings / serves.' },
    kcal: { type: 'number', required: false, description: 'Calories PER SERVING.' },
    protein_g: { type: 'number', required: false, description: 'Protein grams PER SERVING.' },
    tags: { type: 'string[]', required: false, description: 'Up to 4 short tags ("vegetarian", "one pot").' },
    difficulty: { type: '"easy" | "medium" | "hard"', required: false, description: 'Shown as a chip.' },
    ingredients: {
      type: `Array<{ id?: string; name: string; qty?: number; unit?: string; note?: string; aisle?: ${AISLES} }>`,
      required: true,
      description: 'qty is a NUMBER (1.5, not "1 1/2"); the widget prints 1½. unit is separate ("cup", "g", "tbsp"); omit it for counted items ("2" eggs). note: "finely grated".',
    },
    steps: { type: 'Array<{ id?: string; text: string; minutes?: number; tip?: string }>', required: false, description: 'In order. minutes shows a timer chip; tip shows under the step.' },
    goal: { type: '{ kcal?: number; protein_g?: number }', required: false, description: 'Daily goal per person; the protein per serving is shown as a share of it.' },
    servings: { type: 'number', required: false, description: 'Servings to cook; defaults to serves. Two-way bind with `bind: "{state.servings}"`.' },
  },
  example: {
    type: 'recipe',
    bind: '{state.servings}',
    props: {
      name: 'Lemon ricotta pasta',
      subtitle: 'Bright, creamy, on the table in 25 minutes',
      kind: 'dinner',
      serves: 4,
      minutes: 25,
      kcal: 610,
      protein_g: 27,
      difficulty: 'easy',
      tags: ['vegetarian', 'weeknight'],
      ingredients: [
        { name: 'rigatoni', qty: 400, unit: 'g', aisle: 'grains' },
        { name: 'whole-milk ricotta', qty: 1.5, unit: 'cup', aisle: 'dairy' },
        { name: 'lemon', qty: 1, note: 'zest and juice', aisle: 'produce' },
        { name: 'parmesan', qty: 0.75, unit: 'cup', note: 'finely grated', aisle: 'dairy' },
        { name: 'baby spinach', qty: 3, unit: 'cup', aisle: 'produce' },
        { name: 'black pepper', unit: 'to taste', aisle: 'pantry' },
      ],
      steps: [
        { text: 'Boil the rigatoni in well-salted water until just al dente.', minutes: 11, tip: 'Save a mug of the pasta water before draining.' },
        { text: 'Whisk the ricotta, lemon zest and juice, parmesan and plenty of pepper in a large bowl.', minutes: 3 },
        { text: 'Toss the hot pasta and spinach into the bowl, loosening with pasta water until glossy.', minutes: 2 },
      ],
    },
  },
};
