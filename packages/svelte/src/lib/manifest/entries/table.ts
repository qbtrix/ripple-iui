import type { WidgetManifestEntry } from '../index.js';

export const tableEntry: WidgetManifestEntry = {
  type: 'table',
  category: 'data',
  description: 'Tabular data with sorting, search, and optional pagination. Simpler alternative to data-grid.',
  props: {
    rows: { type: 'Array<Record<string, unknown>>', required: true, description: 'Row objects.' },
    columns: { type: 'Array<{ header?: string; accessorKey?: string; sortable?: boolean; href?: string }>', required: true, description: 'Column definitions. `href` names a row field holding a URL; that column\'s cell text then links to it (new tab). Keep the URL in its own row field, not in the visible text.' },
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
        { header: 'Site', accessorKey: 'site', href: 'url' },
      ],
      rows: [
        { name: 'Acme Corp', status: 'Active', revenue: '$52k', site: 'acme.com', url: 'https://acme.com' },
        { name: 'Tech Inc', status: 'Pending', revenue: '$18k', site: 'tech.inc', url: 'https://tech.inc' },
        { name: 'Growth Ltd', status: 'Active', revenue: '$98k', site: 'growth.ltd', url: 'https://growth.ltd' },
      ],
      sortable: true,
      searchable: true,
    },
  },
};
