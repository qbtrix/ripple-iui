import type { WidgetManifestEntry } from '../index.js';

export const tableEntry: WidgetManifestEntry = {
  type: 'table',
  category: 'data',
  description: 'Tabular data with sorting, search, and optional pagination. Simpler alternative to data-grid.',
  props: {
    rows: { type: 'Array<Record<string, unknown>>', required: true, description: 'Row objects.' },
    columns: { type: 'Array<{ header?: string; accessorKey?: string; sortable?: boolean }>', required: true, description: 'Column definitions.' },
    variant: { type: '"default" | "compact" | "striped" | "minimal"', required: false, description: 'Visual style.' },
    sortable: { type: 'boolean', required: false, description: 'Enable click-to-sort headers.' },
    searchable: { type: 'boolean', required: false, description: 'Show search input.' },
    pageSize: { type: 'number', required: false, description: 'Rows per page (paginates if set).' },
  },
  example: {
    type: 'table',
    props: {
      columns: [
        { header: 'Customer', accessorKey: 'name', sortable: true },
        { header: 'Status', accessorKey: 'status' },
        { header: 'Revenue', accessorKey: 'revenue', sortable: true },
      ],
      rows: [
        { name: 'Acme Corp', status: 'Active', revenue: '$52k' },
        { name: 'Tech Inc', status: 'Pending', revenue: '$18k' },
        { name: 'Growth Ltd', status: 'Active', revenue: '$98k' },
      ],
      sortable: true,
      searchable: true,
    },
  },
};
