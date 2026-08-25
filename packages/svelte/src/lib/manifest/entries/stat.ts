import type { WidgetManifestEntry } from '../index.js';

export const statEntry: WidgetManifestEntry = {
  type: 'stat',
  category: 'display',
  description: 'Labeled metric with delta, direction, and sentiment colors. Richer than `metric` — supports formatting.',
  props: {
    label: { type: 'string', required: false, description: 'Stat label.' },
    value: { type: 'number | string', required: true, description: 'Main value.' },
    format: { type: '"number" | "currency" | "percent" | "compact"', required: false, description: 'Number format.' },
    currency: { type: 'string', required: false, description: 'Currency code (default USD).' },
    delta: { type: 'number', required: false, description: 'Absolute change.' },
    deltaPercent: { type: 'number', required: false, description: 'Percent change.' },
    deltaFormat: { type: '"absolute" | "percent" | "both"', required: false, description: 'How delta renders.' },
    direction: { type: '"up" | "down" | "neutral" | "auto" | "up-good" | "down-good"', required: false, description: 'Direction indicator.' },
    size: { type: '"sm" | "md" | "lg"', required: false, description: 'Size variant.' },
  },
  example: { type: 'stat', props: { label: 'Revenue', value: 45230, format: 'currency', delta: 2400, deltaPercent: 5.2, direction: 'up' } },
};
