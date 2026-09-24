import type { WidgetManifestEntry } from '../index.js';

export const peoplePickerEntry: WidgetManifestEntry = {
  type: 'people-picker',
  category: 'vertical',
  description: 'Combobox for selecting people from a searchable directory. Shows name, email, optional role badge.',
  props: {
    label: { type: 'string', required: false, description: 'Field label.' },
    placeholder: { type: 'string', required: false, description: 'Trigger placeholder.' },
    searchPlaceholder: { type: 'string', required: false, description: 'Search input placeholder.' },
    emptyText: { type: 'string', required: false, description: 'Empty-results text.' },
    people: { type: 'Array<{ id: string | number; name: string; email?: string; avatar?: string; role?: string; disabled?: boolean }>', required: true, description: 'People to choose from.' },
    value: { type: 'string | number | (string | number)[] | null', required: false, description: 'Selected id(s).' },
    multiple: { type: 'boolean', required: false, description: 'Allow multi-select.' },
    disabled: { type: 'boolean', required: false, description: 'Disable picker.' },
  },
  example: {
    type: 'people-picker',
    props: {
      label: 'Assign team members',
      multiple: true,
      value: ['alice', 'bob'],
      people: [
        { id: 'alice', name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin' },
        { id: 'bob', name: 'Bob Smith', email: 'bob@example.com', role: 'Editor' },
        { id: 'carol', name: 'Carol Davis', email: 'carol@example.com', role: 'Viewer' },
      ],
    },
  },
};
