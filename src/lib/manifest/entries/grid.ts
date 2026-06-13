// ripple/src/lib/manifest/entries/grid.ts
// Updated 2026-06-13 (docs): description now documents the independent-column-scroll
// recipe for master-detail layouts (fixed height + overflow:hidden via the `style`
// passthrough, overflow-y:auto + min-height:0 on each column). max-height does not work.
import type { WidgetManifestEntry } from '../index.js';

export const gridEntry: WidgetManifestEntry = {
  type: 'grid',
  category: 'layout',
  description: 'CSS grid container. Lays children in evenly-sized columns. Best for KPI rows and card grids. For independent column scroll (master-detail layouts), set a fixed `height` + `overflow:hidden` via the `style` passthrough and give each column `overflow-y:auto; min-height:0`. `max-height` does NOT work — the grid row stays max-content.',
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
