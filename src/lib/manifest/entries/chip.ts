import type { WidgetManifestEntry } from '../index.js';

export const chipEntry: WidgetManifestEntry = {
  type: 'chip',
  category: 'display',
  description: 'Pill-shaped tag with optional close button.',
  props: {
    label: { type: 'string', required: true, description: 'Chip text.' },
    variant: { type: '"default" | "primary" | "success" | "warning" | "destructive"', required: false, description: 'Style variant.' },
    size: { type: '"sm" | "md"', required: false, description: 'Size variant.' },
    closable: { type: 'boolean', required: false, description: 'Show X close button.' },
  },
  example: { type: 'chip', props: { label: 'TypeScript', variant: 'primary', closable: true } },
};
