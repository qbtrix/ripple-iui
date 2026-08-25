// ripple/src/lib/manifest/entries/metric.ts
import type { WidgetManifestEntry } from '../index.js';

export const metricEntry: WidgetManifestEntry = {
  type: 'metric',
  category: 'display',
  description:
    'Single KPI tile: large value with label and optional trend badge and description.',
  props: {
    label: { type: 'string', required: true, description: 'Short metric name shown above the value.' },
    value: { type: 'string | number', required: true, description: 'The number or formatted string to display.' },
    trend: { type: 'string', required: false, description: 'Change badge text, e.g. "+12%" or "-3". Leading +/- drives badge color (green/red).' },
    description: { type: 'string', required: false, description: 'Caption below the value. Only shown in default variant.' },
    variant: { type: '"default" | "compact" | "horizontal"', required: false, description: 'Layout style. Default "default".' },
  },
  example: {
    type: 'metric',
    props: { label: 'MRR', value: '$48.2k', trend: '+8.1%', description: 'vs. last month' },
  },
};
