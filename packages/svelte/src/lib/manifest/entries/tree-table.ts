import type { WidgetManifestEntry } from '../index.js';

export const treeTableEntry: WidgetManifestEntry = {
  type: 'tree-table',
  category: 'data',
  description: 'Table with hierarchical rows and expand/collapse. Combines tree navigation with tabular data.',
  props: {
    columns: { type: 'Array<{ key: string; label: string; align?: "left" | "center" | "right"; width?: string }>', required: true, description: 'Column definitions.' },
    rows: { type: 'Array<Record<string, unknown> & { id?: string | number; children?: Row[] }>', required: true, description: 'Nested rows.' },
    defaultExpanded: { type: '"none" | "first-level" | "all"', required: false, description: 'Initial expansion mode.' },
    value: { type: 'string | number | null', required: false, description: 'Selected row id (use with bind).' },
    striped: { type: 'boolean', required: false, description: 'Alternate row backgrounds.' },
    dense: { type: 'boolean', required: false, description: 'Compact row density.' },
  },
  example: {
    type: 'tree-table',
    props: {
      columns: [
        { key: 'name', label: 'Project' },
        { key: 'status', label: 'Status' },
        { key: 'progress', label: 'Progress' },
      ],
      rows: [
        {
          id: 1,
          name: 'Alpha',
          status: 'In Progress',
          progress: '60%',
          children: [
            { id: '1.1', name: 'Design', status: 'Done', progress: '100%' },
            { id: '1.2', name: 'Dev', status: 'In Progress', progress: '50%' },
          ],
        },
        { id: 2, name: 'Beta', status: 'Planning', progress: '10%' },
      ],
    },
  },
};
