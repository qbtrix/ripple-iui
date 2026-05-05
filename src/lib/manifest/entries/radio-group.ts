import type { WidgetManifestEntry } from '../index.js';

export const radioGroupEntry: WidgetManifestEntry = {
  type: 'radio-group',
  category: 'input',
  description: 'Radio button group for single selection from a list.',
  props: {
    label: { type: 'string', required: false, description: 'Group label.' },
    bind: { type: 'string', required: false, description: 'Two-way state path, e.g. "{state.choice}".' },
    value: { type: 'string', required: false, description: 'Selected value.' },
    options: { type: 'string[] | Array<{ value: string; label: string }>', required: true, description: 'Radio options.' },
    disabled: { type: 'boolean', required: false, description: 'Disable all radios.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired when selection changes.' },
  },
  example: { type: 'radio-group', props: { label: 'Subscription', options: ['Monthly', 'Annual', 'Lifetime'], bind: '{state.subscription}' } },
};
