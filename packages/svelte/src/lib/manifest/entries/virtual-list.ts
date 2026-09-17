import type { WidgetManifestEntry } from '../index.js';

export const virtualListEntry: WidgetManifestEntry = {
  type: 'virtual-list',
  category: 'data',
  description: 'Virtualized list for large datasets. Renders only visible rows.',
  props: {
    items: { type: 'unknown[]', required: true, description: 'Items to render.' },
    itemHeight: { type: 'number', required: false, description: 'Fixed row height in px. Default 36.' },
    height: { type: 'string | number', required: false, description: 'Container height. Default "320px".' },
    overscan: { type: 'number', required: false, description: 'Extra rows above/below visible window. Default 5.' },
    emptyText: { type: 'string', required: false, description: 'Text when items is empty.' },
  },
  example: {
    type: 'virtual-list',
    props: {
      itemHeight: 40,
      height: '320px',
      items: [
        { label: 'Acme Corp' },
        { label: 'Tech Inc' },
        { label: 'Growth Ltd' },
      ],
    },
  },
};
