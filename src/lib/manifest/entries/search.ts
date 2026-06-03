import type { WidgetManifestEntry } from '../index.js';

export const searchEntry: WidgetManifestEntry = {
  type: 'search',
  category: 'input',
  description: 'Search input with dropdown results, grouping, keyboard navigation, and shortcuts.',
  props: {
    bind: { type: 'string', required: false, description: 'Two-way state path for query.' },
    value: { type: 'string', required: false, description: 'Current query.' },
    placeholder: { type: 'string', required: false, description: 'Placeholder text.' },
    results: { type: 'Array<{ id: string | number; label: string; description?: string; icon?: string; group?: string; href?: string; shortcut?: string }>', required: false, description: 'Search results.' },
    alwaysShow: { type: 'boolean', required: false, description: 'Show dropdown even when query is empty.' },
    emptyText: { type: 'string', required: false, description: 'Empty-results text.' },
    loading: { type: 'boolean', required: false, description: 'Show loading indicator.' },
  },
  events: {
    on_input: { type: 'EventAction', required: false, description: 'Fired on every keystroke.' },
    on_change: { type: 'EventAction', required: false, description: 'Fired when the query changes.' },
    on_select: { type: 'EventAction', required: false, description: 'Fired when a result is selected.' },
  },
  example: {
    type: 'search',
    props: {
      placeholder: 'Search users…',
      results: [
        { id: 1, label: 'Alice Chen', description: 'Product Designer', group: 'Users', icon: 'user' },
        { id: 2, label: 'Bob Singh', description: 'Engineering Lead', group: 'Users', icon: 'user' },
      ],
      bind: '{state.searchQuery}',
    },
  },
  pocket: {
    state: { searchQuery: '', lastSelected: null },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'search',
          props: {
            placeholder: 'Search users…',
            results: [
              { id: 1, label: 'Alice Chen', description: 'Product Designer', group: 'Users', icon: 'user' },
              { id: 2, label: 'Bob Singh', description: 'Engineering Lead', group: 'Users', icon: 'user' },
              { id: 3, label: 'Carol Park', description: 'Customer Success', group: 'Users', icon: 'user' },
            ],
          },
          bind: 'state.searchQuery',
          on_select: { action: 'set', target: 'lastSelected', value: '{event}' },
        },
        { type: 'text', show: '{state.lastSelected != null}', props: { text: 'Picked: {state.lastSelected.label}' } },
      ],
    },
  },
};
