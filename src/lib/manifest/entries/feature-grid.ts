// @file manifest/entries/feature-grid.ts — manifest entry for the `feature-grid` widget.
// @created 2026-05-30 — RFC 12 marketing widget pack.
import type { WidgetManifestEntry } from '../index.js';

export const featureGridEntry: WidgetManifestEntry = {
  type: 'feature-grid',
  category: 'layout',
  description: 'Responsive grid of feature cells (title + description). Aliased as features. Use to lay out product benefits on a landing page.',
  props: {
    features: { type: 'Array<{ title: string; description?: string; icon?: string }>', required: true, description: 'Feature cells.' },
    columns: { type: '2 | 3 | 4', required: false, description: 'Columns on md+. Default 3.' },
  },
  example: {
    type: 'feature-grid',
    props: {
      columns: 3,
      features: [
        { title: 'Edge-fast', description: 'Served from the closest edge node.' },
        { title: 'You own it', description: 'Your domain, your brand, your data.' },
        { title: 'Edit by chat', description: 'Change anything just by asking.' },
      ],
    },
  },
};
