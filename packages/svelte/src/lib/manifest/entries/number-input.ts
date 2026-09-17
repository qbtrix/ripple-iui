import type { WidgetManifestEntry } from '../index.js';

export const numberInputEntry: WidgetManifestEntry = {
  type: 'number-input',
  category: 'input',
  description: 'Numeric input with increment/decrement buttons and min/max/step constraints.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path, e.g. "{state.qty}".' },
    value: { type: 'number | null', required: false, description: 'Current value.' },
    min: { type: 'number', required: false, description: 'Minimum value.' },
    max: { type: 'number', required: false, description: 'Maximum value.' },
    step: { type: 'number', required: false, description: 'Step increment. Default 1.' },
    placeholder: { type: 'string', required: false, description: 'Placeholder text.' },
    disabled: { type: 'boolean', required: false, description: 'Disable input.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired on value change.' },
  },
  example: { type: 'number-input', props: { label: 'Quantity', min: 1, max: 100, step: 1, bind: '{state.quantity}' } },
  pocket: {
    state: { quantity: 1 },
    ui: {
      type: 'flex',
      props: { direction: 'row', gap: '12px', align: 'center' },
      children: [
        { type: 'number-input', props: { label: 'Quantity', min: 1, max: 99 }, bind: 'state.quantity' },
        { type: 'text', props: { text: 'Subtotal: ${state.quantity * 12}' } },
      ],
    },
  },
};
