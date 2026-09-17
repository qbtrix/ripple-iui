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
  pocket: {
    state: { range: '7d', revenue: 48200, users: 1240, churn: 2.1 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'segmented',
          props: {
            options: [
              { value: '24h', label: '24h' },
              { value: '7d', label: '7d' },
              { value: '30d', label: '30d' },
              { value: '90d', label: '90d' },
            ],
          },
          bind: 'state.range',
        },
        {
          type: 'dashboard',
          props: { columnMin: '200px', gap: '16px' },
          children: [
            { type: 'metric', props: { label: 'Revenue ({state.range})', value: '${state.revenue}' } },
            { type: 'metric', props: { label: 'Users ({state.range})', value: '{state.users}' } },
            { type: 'metric', props: { label: 'Churn ({state.range})', value: '{state.churn}%' } },
          ],
        },
      ],
    },
  },
};
