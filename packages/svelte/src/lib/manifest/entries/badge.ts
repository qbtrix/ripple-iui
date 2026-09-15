import type { WidgetManifestEntry } from '../index.js';

export const badgeEntry: WidgetManifestEntry = {
  type: 'badge',
  category: 'display',
  description: 'Colored label with semantic variants (success, warning, destructive).',
  props: {
    text: { type: 'string', required: false, description: 'Badge text.' },
    variant: { type: '"default" | "secondary" | "destructive" | "outline" | "success" | "warning"', required: false, description: 'Style variant.' },
  },
  example: { type: 'badge', props: { text: 'Active', variant: 'success' } },
};
