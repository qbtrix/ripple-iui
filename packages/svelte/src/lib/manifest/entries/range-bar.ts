import type { WidgetManifestEntry } from '../index.js';

export const rangeBarEntry: WidgetManifestEntry = {
  type: 'range-bar',
  category: 'research',
  description: 'Range indicator with min/max bounds, current marker, and optional formatted labels.',
  props: {
    min: { type: 'number', required: true, description: 'Minimum value (left bound).' },
    max: { type: 'number', required: true, description: 'Maximum value (right bound).' },
    current: { type: 'number', required: true, description: 'Current value (marker position).' },
    label: { type: 'string', required: false, description: 'Range label.' },
    minLabel: { type: 'string', required: false, description: 'Formatted min label.' },
    maxLabel: { type: 'string', required: false, description: 'Formatted max label.' },
    currentLabel: { type: 'string', required: false, description: 'Formatted current label.' },
    color: { type: 'string', required: false, description: 'Bar color (CSS).' },
  },
  example: { type: 'range-bar', props: { label: 'Price Target Range', min: 150, max: 220, current: 189.45, minLabel: '$150', maxLabel: '$220', currentLabel: '$189.45', color: '#3b82f6' } },
};
