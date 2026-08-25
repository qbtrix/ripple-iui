import type { WidgetManifestEntry } from '../index.js';

export const treemapEntry: WidgetManifestEntry = {
  type: 'treemap',
  category: 'data',
  description: 'Hierarchical treemap showing composition and relative sizes. Click to zoom into nested groups.',
  props: {
    data: { type: 'Array<{ name: string; value?: number; children?: Node[]; color?: string }>', required: true, description: 'Recursive node tree.' },
    height: { type: 'number', required: false, description: 'Height in px. Default 320.' },
    title: { type: 'string', required: false, description: 'Chart title.' },
    showBreadcrumb: { type: 'boolean', required: false, description: 'Show breadcrumb navigation.' },
    showLabels: { type: 'boolean', required: false, description: 'Show child labels.' },
  },
  example: {
    type: 'treemap',
    props: {
      title: 'Budget Breakdown',
      data: [
        { name: 'Product', value: 50, children: [{ name: 'Dev', value: 30 }, { name: 'Design', value: 20 }] },
        { name: 'Operations', value: 30 },
        { name: 'Marketing', value: 20 },
      ],
    },
  },
};
