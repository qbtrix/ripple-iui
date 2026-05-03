import type { WidgetManifestEntry } from '../index.js';

export const containerEntry: WidgetManifestEntry = {
  type: 'container',
  category: 'layout',
  description: 'Simple div wrapper for grouping children. Use for basic structural grouping without semantic meaning.',
  props: {},
  example: {
    type: 'container',
    props: {},
    children: [
      { type: 'text', props: { content: 'Wrapped content' } },
    ],
  },
};
