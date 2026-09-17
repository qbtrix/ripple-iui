// src/lib/manifest/entries/checkbox-group.ts
// @file manifest/entries/checkbox-group.ts
// @description Manifest entry for the `checkbox-group` widget — a multi-select
//   list with Fluid Functionalism's gliding hover highlight + merged backgrounds
//   for contiguous selections. Ported from FF (MIT) onto our motion primitive.
// @created 2026-05-30 — RFC 12 premium pack: FF checkbox-group port (PR #45).

import type { WidgetManifestEntry } from '../index.js';

export const checkboxGroupEntry: WidgetManifestEntry = {
  type: 'checkbox-group',
  category: 'input',
  description:
    'Multi-select checkbox list. A background highlight glides between items on hover; contiguous checked items share a merged background. Bind an array of checked values.',
  props: {
    label: { type: 'string', required: false, description: 'Group label.' },
    bind: { type: 'string', required: false, description: 'Two-way state path holding the array of checked values, e.g. "{state.toppings}".' },
    value: { type: '(string | number)[]', required: false, description: 'Array of checked values.' },
    options: { type: 'string[] | Array<{ value: string | number; label: string; disabled?: boolean }>', required: true, description: 'Checkbox options.' },
    disabled: { type: 'boolean', required: false, description: 'Disable the whole group.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired with the new array of checked values when any item toggles.' },
  },
  example: {
    type: 'checkbox-group',
    props: { label: 'Toppings', options: ['Cheese', 'Mushrooms', 'Olives', 'Onions'] },
    bind: '{state.toppings}',
  },
  pocket: {
    state: { toppings: ['Cheese'] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'checkbox-group',
          props: {
            label: 'Toppings',
            options: [
              { value: 'cheese', label: 'Extra cheese' },
              { value: 'mushrooms', label: 'Mushrooms' },
              { value: 'olives', label: 'Olives' },
              { value: 'onions', label: 'Onions' },
            ],
          },
          bind: 'toppings',
        },
        { type: 'text', props: { text: 'Selected: {state.toppings}' } },
      ],
    },
  },
};
