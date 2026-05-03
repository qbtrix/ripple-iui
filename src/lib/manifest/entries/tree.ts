import type { WidgetManifestEntry } from '../index.js';

export const treeEntry: WidgetManifestEntry = {
  type: 'tree',
  category: 'data',
  description: 'Hierarchical tree view with expand/collapse, icons, and optional selection.',
  props: {
    nodes: { type: 'Array<{ id: string | number; label: string; icon?: string; description?: string; children?: TreeNode[] }>', required: true, description: 'Nested node tree.' },
    value: { type: 'string | number | null', required: false, description: 'Selected node id (use with bind).' },
    defaultExpanded: { type: '"none" | "first-level" | "all"', required: false, description: 'Initial expansion mode.' },
    on_change: { type: 'EventAction', required: false, description: 'Fired on node selection.' },
  },
  example: {
    type: 'tree',
    props: {
      defaultExpanded: 'first-level',
      nodes: [
        {
          id: 'docs',
          label: 'Docs',
          icon: 'folder',
          children: [
            { id: 'docs-api', label: 'API', icon: 'file-text' },
            { id: 'docs-guide', label: 'Guide', icon: 'book-open' },
          ],
        },
        { id: 'components', label: 'Components', icon: 'box' },
      ],
    },
  },
};
