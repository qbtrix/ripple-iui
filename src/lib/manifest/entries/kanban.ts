import type { WidgetManifestEntry } from '../index.js';

export const kanbanEntry: WidgetManifestEntry = {
  type: 'kanban',
  category: 'data',
  description: 'Drag-and-drop kanban board. Cards group into columns by `columnKey`. Bind to receive reordered cards.',
  props: {
    columns: { type: 'Array<{ id: string; title: string; color?: string }>', required: true, description: 'Column definitions.' },
    value: { type: 'Array<Record<string, unknown> & { id: string | number }>', required: true, description: 'Cards (bind to receive reorders).' },
    columnKey: { type: 'string', required: false, description: 'Card field for column id. Default "status".' },
    titleKey: { type: 'string', required: false, description: 'Card field for title. Default "title".' },
    descriptionKey: { type: 'string', required: false, description: 'Card field for description.' },
    badgeKey: { type: 'string', required: false, description: 'Card field for top-right badge.' },
    on_change: { type: 'EventAction', required: false, description: 'Fired when cards are reordered.' },
  },
  example: {
    type: 'kanban',
    props: {
      columns: [
        { id: 'todo', title: 'To Do' },
        { id: 'in-progress', title: 'In Progress' },
        { id: 'done', title: 'Done' },
      ],
      columnKey: 'status',
      titleKey: 'title',
      value: [
        { id: 1, title: 'Design mockups', status: 'todo' },
        { id: 2, title: 'Review feedback', status: 'in-progress' },
        { id: 3, title: 'Finalize spec', status: 'done' },
      ],
    },
  },
};
