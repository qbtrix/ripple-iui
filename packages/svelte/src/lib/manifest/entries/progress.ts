import type { WidgetManifestEntry } from '../index.js';

export const progressEntry: WidgetManifestEntry = {
  type: 'progress',
  category: 'display',
  description: 'Horizontal progress bar with color and height variants.',
  props: {
    value: { type: 'number', required: false, description: 'Current progress (0 to max).' },
    max: { type: 'number', required: false, description: 'Maximum value. Default 100.' },
    color: { type: 'string', required: false, description: 'Bar color (CSS color).' },
    variant: { type: '"default" | "thin" | "thick"', required: false, description: 'Height variant.' },
  },
  example: { type: 'progress', props: { value: 65, max: 100, variant: 'default' } },
};
