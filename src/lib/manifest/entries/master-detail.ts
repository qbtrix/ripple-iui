import type { WidgetManifestEntry } from '../index.js';

export const masterDetailEntry: WidgetManifestEntry = {
  type: 'master-detail',
  category: 'layout',
  description: 'List on left, detail view on right. Selected item flows into detail spec via loop context.',
  props: {
    items: { type: 'Array<Record<string, unknown>>', required: true, description: 'Items shown in master list.' },
    value: { type: 'string | number | null', required: false, description: 'Currently selected item value.' },
    valueKey: { type: 'string', required: false, description: 'Item field for unique value. Default "id".' },
    labelKey: { type: 'string', required: false, description: 'Item field for label. Default "label".' },
    descriptionKey: { type: 'string', required: false, description: 'Item field for description. Default "description".' },
    badgeKey: { type: 'string', required: false, description: 'Item field for badge. Default "badge".' },
    width: { type: 'string', required: false, description: 'Master pane width. Default "240px".' },
    emptyText: { type: 'string', required: false, description: 'Empty-state message.' },
  },
  example: {
    type: 'master-detail',
    props: {
      items: [
        { id: 1, label: 'Contract.pdf', description: '12 pages' },
        { id: 2, label: 'Invoice.pdf', description: '2 pages' },
      ],
      valueKey: 'id',
      labelKey: 'label',
      descriptionKey: 'description',
    },
  },
};
