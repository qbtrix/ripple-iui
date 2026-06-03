import type { WidgetManifestEntry } from '../index.js';

export const kvTableEntry: WidgetManifestEntry = {
  type: 'kv-table',
  category: 'research',
  description: 'Key-value table with optional striping and multi-column layout. Use for fact sheets, company metrics.',
  props: {
    rows: { type: 'Array<{ key: string; value: string }>', required: true, description: 'Key/value pairs.' },
    columns: { type: 'number', required: false, description: 'Number of columns (1 or 2). Default 1.' },
    striped: { type: 'boolean', required: false, description: 'Alternate row backgrounds.' },
  },
  example: {
    type: 'kv-table',
    props: {
      columns: 2,
      striped: true,
      rows: [
        { key: 'P/E Ratio', value: '28.45' },
        { key: 'Market Cap', value: '$2.95T' },
        { key: 'Revenue', value: '$394.3B' },
        { key: 'EPS', value: '$6.45' },
        { key: 'Dividend Yield', value: '0.47%' },
        { key: 'Beta', value: '1.22' },
      ],
    },
  },
};
