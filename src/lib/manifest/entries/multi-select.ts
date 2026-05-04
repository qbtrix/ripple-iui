import type { WidgetManifestEntry } from '../index.js';

export const multiSelectEntry: WidgetManifestEntry = {
  type: 'multi-select',
  category: 'input',
  description: 'Multi-select dropdown with chip display and optional tag creation.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path for selected values array, e.g. "{state.tags}".' },
    value: { type: '(string | number)[]', required: false, description: 'Selected values.' },
    placeholder: { type: 'string', required: false, description: 'Trigger placeholder.' },
    searchPlaceholder: { type: 'string', required: false, description: 'Search input placeholder.' },
    emptyText: { type: 'string', required: false, description: 'Empty-results text.' },
    options: { type: 'Array<{ value: string | number; label: string; description?: string; disabled?: boolean }>', required: true, description: 'Options to choose from.' },
    creatable: { type: 'boolean', required: false, description: 'Allow creating new tags via Enter.' },
    maxChips: { type: 'number', required: false, description: 'Max chips before "+N more". Default 3.' },
    disabled: { type: 'boolean', required: false, description: 'Disable multi-select.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired on selection change.' },
  },
  example: {
    type: 'multi-select',
    props: {
      label: 'Tags',
      options: [
        { value: 'feature', label: 'Feature' },
        { value: 'bug', label: 'Bug' },
        { value: 'enhancement', label: 'Enhancement' },
        { value: 'docs', label: 'Documentation' },
      ],
      bind: '{state.tags}',
      creatable: true,
    },
  },
};
