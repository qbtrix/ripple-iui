import type { WidgetManifestEntry } from '../index.js';

export const dashboardEntry: WidgetManifestEntry = {
  type: 'dashboard',
  category: 'layout',
  description: 'Auto-fill responsive grid that arranges children into columns. Use for KPI grids and card galleries.',
  props: {
    columnMin: { type: 'string', required: false, description: 'Minimum column width before wrapping. Default "240px".' },
    gap: { type: 'string', required: false, description: 'Grid gap. Default "12px".' },
  },
  example: {
    type: 'dashboard',
    props: { columnMin: '240px', gap: '16px' },
    children: [
      { type: 'metric', props: { label: 'Users', value: 1240 } },
      { type: 'metric', props: { label: 'MRR', value: '$48k' } },
      { type: 'metric', props: { label: 'Churn', value: '2.1%' } },
    ],
  },
};
