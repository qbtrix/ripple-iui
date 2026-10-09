// manifest/entries/bill-split.ts — the LLM-facing entry for the bill-split data
// widget. The model writes the bill, the tip and the people; the widget does
// the cents-exact split, the cards and the totals, and lets the visitor edit
// all of it. `tax` is on top of `subtotal`; the tip is a percent of `subtotal`.
// The bound field is `value` ({ subtotal, tip_percent, people }).
import type { WidgetManifestEntry } from '../index.js';

export const billSplitEntry: WidgetManifestEntry = {
  type: 'bill-split',
  category: 'composite',
  staticSafe: true,
  description:
    'Split a bill with tip: subtotal, tip_percent, people with optional extras (drinks). Widget does the cents-exact maths, cards, totals; visitor edits everything. Bind value.',
  props: {
    title: { type: 'string', required: false, description: 'e.g. "Dinner for 4".' },
    currency: { type: 'string', required: false, description: 'ISO 4217 code. Default "USD". Never put a symbol in the numbers.' },
    subtotal: { type: 'number', required: true, description: 'The bill before tip and before tax, e.g. 186.4.' },
    tax: { type: 'number', required: false, description: 'Tax ON TOP of subtotal, shared in proportion to what each person had. Omit when the subtotal already includes tax.' },
    tip_percent: { type: 'number', required: false, description: 'Percent of subtotal: 18 means 18%. Default 18.' },
    tip_options: { type: 'number[]', required: false, description: 'Tip chips. Default [15, 18, 20, 22].' },
    people: {
      type: 'Array<{ id: string; name: string; extras?: number }>',
      required: true,
      description: '2 to 12 people. `extras` is what that person had on top of the shared part (drinks), as an amount. The rest of the subtotal is split evenly.',
    },
    extras_label: { type: 'string', required: false, description: 'What extras are. Default "Drinks".' },
    note: { type: 'string', required: false, description: 'One line under the totals.' },
  },
  example: {
    type: 'bill-split',
    bind: '{state.bill}',
    props: {
      title: 'Dinner for 4',
      currency: 'USD',
      subtotal: 186.4,
      tip_percent: 18,
      people: [
        { id: 'p1', name: 'Alex', extras: 12 },
        { id: 'p2', name: 'Sam', extras: 0 },
        { id: 'p3', name: 'Priya', extras: 9 },
        { id: 'p4', name: 'Jo', extras: 0 },
      ],
    },
  },
};
