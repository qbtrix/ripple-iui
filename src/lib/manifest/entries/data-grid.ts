import type { WidgetManifestEntry } from '../index.js';

export const dataGridEntry: WidgetManifestEntry = {
  type: 'data-grid',
  category: 'data',
  description: 'High-density tabular data with sticky headers, resizable columns, pagination, and optional sorting. Use over `table` for large datasets.',
  props: {
    columns: { type: 'Array<{ key: string; label: string; sortable?: boolean; align?: "left" | "center" | "right"; width?: string }>', required: true, description: 'Column definitions.' },
    rows: { type: 'Array<Record<string, unknown>>', required: true, description: 'Row objects.' },
    value: { type: 'string | number | null', required: false, description: 'Selected row id (use with bind).' },
    pageSize: { type: 'number', required: false, description: 'Rows per page. Default 10.' },
    searchable: { type: 'boolean', required: false, description: 'Show search input.' },
    defaultSort: { type: 'string', required: false, description: 'Initial sort: "key" or "key:desc".' },
    striped: { type: 'boolean', required: false, description: 'Alternate row backgrounds.' },
    dense: { type: 'boolean', required: false, description: 'Compact row density.' },
    emptyText: { type: 'string', required: false, description: 'Empty-state text.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired on row selection.' },
  },
  example: {
    type: 'data-grid',
    props: {
      columns: [
        { key: 'name', label: 'Customer', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        { key: 'revenue', label: 'Revenue', align: 'right', sortable: true },
      ],
      rows: [
        { id: 1, name: 'Alice', email: 'alice@example.com', revenue: '$8,400' },
        { id: 2, name: 'Bob', email: 'bob@example.com', revenue: '$5,200' },
        { id: 3, name: 'Carol', email: 'carol@example.com', revenue: '$12,800' },
      ],
      searchable: true,
    },
  },
};
