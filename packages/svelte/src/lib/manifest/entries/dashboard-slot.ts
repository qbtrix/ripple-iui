import type { WidgetManifestEntry } from '../index.js';

export const dashboardSlotEntry: WidgetManifestEntry = {
  type: 'dashboard-slot',
  category: 'layout',
  description: 'Grid item wrapper for use inside dashboard. Controls per-item column span.',
  props: {
    slotId: { type: 'string', required: true, description: 'Unique slot identifier.' },
    itemId: { type: 'string', required: true, description: 'Unique item identifier.' },
    span: { type: 'number | "auto"', required: false, description: 'Column span (1, 2, 3) or "auto". Default 1.' },
  },
  example: {
    type: 'dashboard-slot',
    props: { slotId: 'top-row', itemId: 'mrr-tile', span: 2 },
    children: [
      { type: 'metric', props: { label: 'MRR', value: '$48k' } },
    ],
  },
};
