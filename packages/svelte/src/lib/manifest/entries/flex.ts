// ripple/src/lib/manifest/entries/flex.ts
import type { WidgetManifestEntry } from '../index.js';

export const flexEntry: WidgetManifestEntry = {
  type: 'flex',
  category: 'layout',
  description: 'Flexbox container. Lays children in a row or column with gap and alignment control.',
  props: {
    direction: { type: '"row" | "column"', required: false, description: 'Main axis. Defaults to row.' },
    gap: { type: 'number | string', required: false, description: 'Gap between children. Number → tailwind spacing units (4px multiplier, e.g. 4 → 16px); string → raw CSS gap (e.g. "12px").' },
    align: { type: '"start" | "center" | "end" | "stretch"', required: false, description: 'Cross-axis alignment.' },
    justify: { type: '"start" | "center" | "end" | "between" | "around"', required: false, description: 'Main-axis distribution.' },
    wrap: { type: 'boolean', required: false, description: 'Allow children to wrap to next line.' },
  },
  example: {
    type: 'flex',
    props: { direction: 'row', gap: 4, justify: 'between' },
    children: [
      { type: 'text', props: { text: 'Left' } },
      { type: 'text', props: { text: 'Right' } },
    ],
  },
};
