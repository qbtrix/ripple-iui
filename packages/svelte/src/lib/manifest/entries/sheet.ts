import type { WidgetManifestEntry } from '../index.js';

export const sheetEntry: WidgetManifestEntry = {
  type: 'sheet',
  category: 'layout',
  description: 'Slide-in panel from any edge (top/right/bottom/left). Use for sidebars and off-canvas menus.',
  props: {
    value: { type: 'boolean', required: false, description: 'Open state. Use with bind.' },
    side: { type: '"top" | "right" | "bottom" | "left"', required: false, description: 'Slide direction. Default "right".' },
    title: { type: 'string', required: false, description: 'Sheet header title.' },
    description: { type: 'string', required: false, description: 'Sheet header description.' },
  },
  example: {
    type: 'sheet',
    props: { value: false, side: 'right', title: 'Filters' },
    children: [
      { type: 'text', props: { text: 'Filter options here.' } },
    ],
  },
  pocket: {
    state: { filtersOpen: false, inStock: true },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'button',
          props: { label: 'Open filters', variant: 'secondary' },
          on_click: { action: 'open', target: 'filtersOpen' },
        },
        {
          type: 'sheet',
          props: { side: 'right', title: 'Filters', description: 'Narrow the product list.' },
          bind: 'state.filtersOpen',
          children: [
            { type: 'switch', props: { label: 'In stock only' }, bind: 'state.inStock' },
            {
              type: 'button',
              props: { label: 'Apply' },
              on_click: { action: 'set', target: 'filtersOpen', value: false },
            },
          ],
        },
      ],
    },
  },
};
