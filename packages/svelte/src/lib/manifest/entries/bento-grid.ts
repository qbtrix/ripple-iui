// @file manifest/entries/bento-grid.ts — manifest entry for the `bento-grid` widget.
// @created 2026-05-30 — RFC 12 premium pack (svelte-animations, MIT).
import type { WidgetManifestEntry } from '../index.js';

export const bentoGridEntry: WidgetManifestEntry = {
  type: 'bento-grid',
  category: 'layout',
  description: 'A bento/masonry feature grid where cells span 1-3 columns for a varied layout. Aliased bento. Use for a feature showcase or product grid.',
  props: {
    items: { type: 'Array<{ title: string; description?: string; span?: 1 | 2 | 3 }>', required: false, description: 'Declarative cells. Omit to supply your own via children.' },
    columns: { type: 'number', required: false, description: 'Column count. Default 3.' },
  },
  example: {
    type: 'bento-grid',
    props: {
      columns: 3,
      items: [
        { title: 'Edge-fast', description: 'Deployed worldwide.', span: 2 },
        { title: 'White-label', description: 'Your brand, end to end.' },
        { title: 'No infra', description: 'We host it.' },
      ],
    },
  },
};
