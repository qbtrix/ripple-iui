// ripple/src/lib/manifest/entries/grid.ts
// Updated 2026-07-08 (docs): description trimmed under 200 chars (manifest.test limit)
// while keeping the independent-column-scroll gotcha (fixed height + overflow:hidden via
// `style`; max-height does NOT work).
import type { WidgetManifestEntry } from '../index.js';

export const gridEntry: WidgetManifestEntry = {
  type: 'grid',
  category: 'layout',
  description: 'CSS grid; even columns. Best for KPI rows and card grids. For independent column scroll, set fixed `height` + `overflow:hidden` via `style`; columns `overflow-y:auto`. `max-height` does NOT work.',
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
