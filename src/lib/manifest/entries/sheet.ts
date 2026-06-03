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
};
