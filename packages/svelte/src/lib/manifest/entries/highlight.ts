import type { WidgetManifestEntry } from '../index.js';

export const highlightEntry: WidgetManifestEntry = {
  type: 'highlight',
  category: 'display',
  description: 'Big-stat hero number with label, description, and trend delta. Use for headline KPIs.',
  props: {
    value: { type: 'string | number', required: true, description: 'Main value.' },
    label: { type: 'string', required: false, description: 'Label below value.' },
    description: { type: 'string', required: false, description: 'Additional context.' },
    delta: { type: 'string', required: false, description: 'Delta text (e.g. "+12.4%").' },
    tone: { type: '"positive" | "negative" | "neutral"', required: false, description: 'Delta tone (auto-derives from sign).' },
  },
  example: { type: 'highlight', props: { value: '1,250', label: 'Total orders', delta: '+8.5%', tone: 'positive' } },
};
