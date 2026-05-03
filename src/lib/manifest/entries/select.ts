import type { WidgetManifestEntry } from '../index.js';

export const selectEntry: WidgetManifestEntry = {
  type: 'select',
  category: 'input',
  description: 'Single-select dropdown with options.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path, e.g. "{state.tier}".' },
    value: { type: 'string', required: false, description: 'Selected value.' },
    placeholder: { type: 'string', required: false, description: 'Placeholder text.' },
    options: { type: 'string[] | Array<{ value: string; label: string }>', required: true, description: 'Option list.' },
    disabled: { type: 'boolean', required: false, description: 'Disable select.' },
    on_change: { type: 'EventAction', required: false, description: 'Fired when selection changes.' },
  },
  example: {
    type: 'select',
    props: {
      label: 'Plan',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'pro', label: 'Pro' },
        { value: 'enterprise', label: 'Enterprise' },
      ],
      bind: '{state.plan}',
    },
  },
};
