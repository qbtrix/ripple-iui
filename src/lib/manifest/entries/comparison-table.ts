import type { WidgetManifestEntry } from '../index.js';

export const comparisonTableEntry: WidgetManifestEntry = {
  type: 'comparison-table',
  category: 'display',
  description: 'Feature comparison table. Cells accept boolean (renders ✓/✗), string, or number.',
  props: {
    label: { type: 'string', required: false, description: 'First column header. Default "Feature".' },
    columns: { type: 'Array<{ key: string; label: string; highlight?: boolean }>', required: true, description: 'Column definitions.' },
    rows: { type: 'Array<{ feature: string; [key: string]: unknown }>', required: true, description: 'Table rows. `feature` is the row label; remaining keys map to column keys.' },
  },
  example: {
    type: 'comparison-table',
    props: {
      label: 'Feature',
      columns: [
        { key: 'free', label: 'Free' },
        { key: 'pro', label: 'Pro', highlight: true },
      ],
      rows: [
        { feature: 'Users', free: 1, pro: 'Unlimited' },
        { feature: 'API access', free: false, pro: true },
        { feature: 'Support', free: 'Email', pro: '24/7' },
      ],
    },
  },
};
