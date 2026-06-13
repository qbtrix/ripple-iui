// Updated 2026-06-13 (docs): description now states the native independent-scroll +
// sticky-detail behaviour and the master-item customization cliff (list items support
// only valueKey/labelKey/descriptionKey/badgeKey; bespoke list cards need a hand-rolled grid).
import type { WidgetManifestEntry } from '../index.js';

export const masterDetailEntry: WidgetManifestEntry = {
  type: 'master-detail',
  category: 'layout',
  description: 'List on left, detail view on right. Selected item flows into detail spec via loop context. Provides independent scroll + a sticky detail pane natively, and its `detail` prop accepts a full custom spec. BUT master list items are limited to valueKey/labelKey/descriptionKey/badgeKey (no custom item template) — for bespoke list cards, hand-roll a grid with the fixed-height + overflow recipe instead.',
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
  pocket: {
    state: {
      selectedId: 1,
      tickets: [
        { id: 1, title: 'Login fails on Safari', priority: 'high', body: 'Users on Safari 17 hit a redirect loop after OAuth.' },
        { id: 2, title: 'Export is slow', priority: 'medium', body: 'CSV export of >10k rows takes >30s.' },
        { id: 3, title: 'Typo in onboarding', priority: 'low', body: '"Welome" should be "Welcome" on the second step.' },
      ],
    },
    ui: {
      type: 'master-detail',
      props: {
        items: '{state.tickets}',
        valueKey: 'id',
        labelKey: 'title',
        descriptionKey: 'priority',
        width: '320px',
        detail: {
          type: 'flex',
          props: { direction: 'column', gap: '12px' },
          children: [
            { type: 'heading', props: { level: 3, text: '{item.title}' } },
            { type: 'badge', props: { text: '{item.priority}', variant: 'secondary' } },
            { type: 'text', props: { text: '{item.body}' } },
          ],
        },
      },
      bind: 'state.selectedId',
    },
  },
};
