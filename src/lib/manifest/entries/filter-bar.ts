import type { WidgetManifestEntry } from '../index.js';

export const filterBarEntry: WidgetManifestEntry = {
  type: 'filter-bar',
  category: 'input',
  description: 'Chip-based filter UI with add/remove buttons. Use above lists/tables for multi-criteria filtering.',
  props: {
    bind: { type: 'string', required: false, description: 'Two-way state path for active filters array, e.g. "{state.filters}".' },
    options: { type: 'Array<{ key: string; label: string; type?: string; default?: unknown }>', required: true, description: 'Available filter definitions.' },
    addLabel: { type: 'string', required: false, description: 'Add-button label. Default "Filter".' },
    showClearAll: { type: 'boolean', required: false, description: 'Show clear-all button. Default true.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired when filters change.' },
  },
  example: {
    type: 'filter-bar',
    props: {
      options: [
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'assignee', label: 'Assignee' },
      ],
      bind: '{state.filters}',
      showClearAll: true,
    },
  },
};
