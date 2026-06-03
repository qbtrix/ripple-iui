// ripple/src/lib/manifest/entries/grid.ts
import type { WidgetManifestEntry } from '../index.js';

export const gridEntry: WidgetManifestEntry = {
  type: 'grid',
  category: 'layout',
  description: 'CSS grid container. Lays children in evenly-sized columns. Best for KPI rows and card grids.',
  props: {
    columns: { type: 'number | string', required: false, description: 'Number of columns (number → repeat(N, 1fr)) or a raw grid-template-columns value. Defaults to 1.' },
    rows: { type: 'number | string', required: false, description: 'Optional number of rows or grid-template-rows value.' },
    gap: { type: 'number | string', required: false, description: 'Gap between cells. Number → tailwind spacing units (4px multiplier); string → raw CSS gap (e.g. "12px").' },
  },
  example: {
    type: 'grid',
    props: { columns: 3, gap: '12px' },
    children: [
      { type: 'metric', props: { label: 'Users', value: 1240 } },
      { type: 'metric', props: { label: 'MRR', value: '$48k' } },
      { type: 'metric', props: { label: 'Churn', value: '2.1%' } },
    ],
  },
};
