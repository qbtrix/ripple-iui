// Manifest entry for the fill-grid widget (console telemetry pack, 2026-06-13).
import type { WidgetManifestEntry } from '../index.js';

export const fillGridEntry: WidgetManifestEntry = {
  type: 'fill-grid',
  category: 'display',
  staticSafe: true,
  description:
    'Discrete heap/segment meter — a row (or matrix) of M cells, the first N filled per value/max, the rest faint ghost cells. Pure CSS, SSR-safe.',
  props: {
    value: { type: 'number', required: false, description: 'Current value. Filled cells = round(value/max * total).' },
    max: { type: 'number', required: false, description: 'Max value. Default 100.' },
    total: { type: 'number', required: false, description: 'Total number of cells. Default 24.' },
    cols: { type: 'number', required: false, description: 'Columns for a matrix layout. Omit for a single row.' },
    color: { type: 'string', required: false, description: 'Filled-cell color. Default the primary token.' },
    cellHeight: { type: 'number', required: false, description: 'Cell height in px. Default 12.' },
    gap: { type: 'number', required: false, description: 'Gap between cells in px. Default 3.' },
  },
  example: {
    type: 'fill-grid',
    props: { value: 100, max: 100, total: 24, color: '#2FB970' },
  },
};
