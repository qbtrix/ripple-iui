import type { WidgetManifestEntry } from '../index.js';

export const trendEntry: WidgetManifestEntry = {
  type: 'trend',
  category: 'display',
  description: 'Inline delta badge with arrow and formatted value (percent / number / currency).',
  props: {
    value: { type: 'number', required: true, description: 'Delta value (sign drives arrow direction).' },
    format: { type: '"percent" | "number" | "currency"', required: false, description: 'Value format.' },
    currency: { type: 'string', required: false, description: 'Currency code.' },
    arrow: { type: 'boolean', required: false, description: 'Show up/down arrow. Default true.' },
    precision: { type: 'number', required: false, description: 'Decimal places. Default 1.' },
  },
  example: { type: 'trend', props: { value: 12.4, format: 'percent', arrow: true } },
};
