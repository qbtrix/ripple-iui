import type { WidgetManifestEntry } from '../index.js';

export const splitEntry: WidgetManifestEntry = {
  type: 'split',
  category: 'layout',
  description: 'Resizable two-pane layout (horizontal or vertical) with draggable divider. Use for inspector panels.',
  props: {
    direction: { type: '"horizontal" | "vertical"', required: false, description: 'Pane direction. Default "horizontal".' },
    defaultSize: { type: 'number', required: false, description: 'Initial first-pane size as percent. Default 50.' },
    minSize: { type: 'number', required: false, description: 'Minimum first-pane percent. Default 10.' },
    maxSize: { type: 'number', required: false, description: 'Maximum first-pane percent. Default 90.' },
  },
  example: {
    type: 'split',
    props: { direction: 'horizontal', defaultSize: 30 },
    children: [
      { type: 'text', props: { content: 'Left navigation' } },
      { type: 'text', props: { content: 'Right detail view' } },
    ],
  },
};
