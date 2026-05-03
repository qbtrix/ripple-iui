import type { WidgetManifestEntry } from '../index.js';

export const datePickerEntry: WidgetManifestEntry = {
  type: 'date-picker',
  category: 'input',
  description: 'Calendar-based date picker (popover).',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path for ISO date (YYYY-MM-DD).' },
    value: { type: 'string | null', required: false, description: 'Selected ISO date.' },
    placeholder: { type: 'string', required: false, description: 'Trigger placeholder.' },
    disabled: { type: 'boolean', required: false, description: 'Disable picker.' },
    format: { type: '"short" | "medium" | "long" | "iso"', required: false, description: 'Display format.' },
    min: { type: 'string', required: false, description: 'Minimum selectable ISO date.' },
    max: { type: 'string', required: false, description: 'Maximum selectable ISO date.' },
    locale: { type: 'string', required: false, description: 'Locale code. Default "en-US".' },
    on_change: { type: 'EventAction', required: false, description: 'Fired on date change.' },
  },
  example: { type: 'date-picker', props: { label: 'Due date', format: 'long', min: '2026-01-01', max: '2026-12-31', bind: '{state.dueDate}' } },
};
