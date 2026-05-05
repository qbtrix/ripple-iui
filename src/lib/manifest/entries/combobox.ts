import type { WidgetManifestEntry } from '../index.js';

export const comboboxEntry: WidgetManifestEntry = {
  type: 'combobox',
  category: 'input',
  description: 'Searchable dropdown with keyboard navigation and optional descriptions per option.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path, e.g. "{state.selectedUser}".' },
    value: { type: 'string | number | null', required: false, description: 'Selected value.' },
    placeholder: { type: 'string', required: false, description: 'Trigger placeholder.' },
    searchPlaceholder: { type: 'string', required: false, description: 'Search input placeholder.' },
    emptyText: { type: 'string', required: false, description: 'Empty-results text.' },
    options: { type: 'Array<{ value: string | number; label: string; description?: string; disabled?: boolean }>', required: true, description: 'Options to choose from.' },
    disabled: { type: 'boolean', required: false, description: 'Disable combobox.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired on selection change.' },
  },
  example: {
    type: 'combobox',
    props: {
      label: 'Assignee',
      options: [
        { value: 1, label: 'Alice', description: 'Admin' },
        { value: 2, label: 'Bob', description: 'Editor' },
        { value: 3, label: 'Carol', description: 'Viewer' },
      ],
      bind: '{state.assigneeId}',
      searchPlaceholder: 'Search users…',
    },
  },
};
