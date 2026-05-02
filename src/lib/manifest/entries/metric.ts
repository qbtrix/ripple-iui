// ripple/src/lib/manifest/entries/metric.ts
import type { WidgetManifestEntry } from '../index.js';

export const metricEntry: WidgetManifestEntry = {
  type: 'metric',
  category: 'display',
  description:
    'Single KPI tile: large value with optional label, delta, and trend indicator.',
  props: {
    label: { type: 'string', required: false, description: 'Short metric name shown above the value.' },
    value: { type: 'string | number', required: true, description: 'The number or formatted string to display.' },
    delta: { type: 'string', required: false, description: 'Change indicator, e.g. "+12%" or "-3".' },
    trend: { type: '"up" | "down" | "flat"', required: false, description: 'Direction arrow color/icon.' },
  },
  example: {
    type: 'metric',
    props: { label: 'MRR', value: '$48.2k', delta: '+8.1%', trend: 'up' },
  },
};
