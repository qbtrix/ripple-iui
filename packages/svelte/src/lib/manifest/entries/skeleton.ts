import type { WidgetManifestEntry } from '../index.js';

export const skeletonEntry: WidgetManifestEntry = {
  type: 'skeleton',
  category: 'display',
  description: 'Loading placeholder shimmer. Variants tune shape: card / dashboard / text.',
  props: {
    variant: { type: '"card" | "dashboard" | "text" | "none"', required: false, description: 'Shape preset.' },
  },
  example: { type: 'skeleton', props: { variant: 'card' } },
};
