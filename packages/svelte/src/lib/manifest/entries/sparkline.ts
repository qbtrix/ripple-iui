import type { WidgetManifestEntry } from '../index.js';

export const sparklineEntry: WidgetManifestEntry = {
  type: 'sparkline',
  category: 'data',
  description: 'Compact mini line chart for trend indicators. Color auto-derives from trend direction.',
  props: {
    values: { type: 'number[]', required: true, description: 'Numeric values, oldest to newest.' },
    labels: { type: '(string | number)[]', required: false, description: 'Optional matching labels for tooltip.' },
    color: { type: 'string', required: false, description: 'Override trend-driven color.' },
    height: { type: 'number', required: false, description: 'Height in px. Default 36.' },
    noTooltip: { type: 'boolean', required: false, description: 'Hide tooltip on hover.' },
  },
  example: { type: 'sparkline', props: { values: [12, 18, 15, 22, 28, 31, 25], labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] } },
};
