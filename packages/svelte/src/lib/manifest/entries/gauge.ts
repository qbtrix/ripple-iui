import type { WidgetManifestEntry } from '../index.js';

export const gaugeEntry: WidgetManifestEntry = {
  type: 'gauge',
  category: 'data',
  description: 'Circular gauge showing progress or single KPI as 0..max arc.',
  props: {
    value: { type: 'number', required: true, description: 'Current value.' },
    max: { type: 'number', required: false, description: 'Maximum value. Default 100.' },
    label: { type: 'string', required: false, description: 'Gauge label.' },
    color: { type: 'string', required: false, description: 'Custom gauge color.' },
    height: { type: 'number', required: false, description: 'Height in px. Default 200.' },
    title: { type: 'string', required: false, description: 'Title above gauge.' },
  },
  example: { type: 'gauge', props: { value: 75, max: 100, label: 'Capacity', height: 240 } },
};
