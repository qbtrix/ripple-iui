import type { WidgetManifestEntry } from '../index.js';

export const badgeEntry: WidgetManifestEntry = {
  type: 'badge',
  category: 'display',
  // 2026-09-16: was "Colored label". After the beautiful-ui re-skin every
  // variant is a tinted rounded-full pill — default and secondary stopped being
  // solid fills — and that pill shape is now the line between badge and chip.
  description: 'Tinted pill label with semantic variants (success, warning, destructive). For a square-cornered tag, use chip.',
  props: {
    text: { type: 'string', required: false, description: 'Badge text.' },
    variant: { type: '"default" | "secondary" | "destructive" | "outline" | "success" | "warning"', required: false, description: 'Style variant.' },
  },
  example: { type: 'badge', props: { text: 'Active', variant: 'success' } },
};
