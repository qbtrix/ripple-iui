// ripple/src/lib/manifest/entries/grid.ts
import type { WidgetManifestEntry } from '../index.js';

export const gridEntry: WidgetManifestEntry = {
  type: 'grid',
  category: 'layout',
  description: 'CSS grid container. Lays children in evenly-sized columns. Best for KPI rows and card grids.',
  props: {
    cols: { type: 'number', required: false, description: 'Number of columns. Defaults to 2.' },
    gap: { type: 'number', required: false, description: 'Gap between cells in tailwind spacing units.' },
  },
  example: {
    type: 'grid',
    props: { cols: 3, gap: 4 },
    children: [
      { type: 'metric', props: { label: 'Users', value: 1240 } },
      { type: 'metric', props: { label: 'MRR', value: '$48k' } },
      { type: 'metric', props: { label: 'Churn', value: '2.1%' } },
    ],
  },
};
