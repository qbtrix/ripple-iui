import type { WidgetManifestEntry } from '../index.js';

export const checkboxEntry: WidgetManifestEntry = {
  type: 'checkbox',
  category: 'input',
  description: 'Checkbox with optional label.',
  props: {
    label: { type: 'string', required: false, description: 'Label shown next to checkbox.' },
    bind: { type: 'string', required: false, description: 'Two-way state path, e.g. "{state.agreed}".' },
    checked: { type: 'boolean', required: false, description: 'Checked state.' },
    disabled: { type: 'boolean', required: false, description: 'Disable checkbox.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired on toggle.' },
  },
  example: { type: 'checkbox', props: { label: 'I agree to the terms', bind: '{state.agreed}' } },
  pocket: {
    state: { agreed: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'checkbox', props: { label: 'I agree to the terms' }, bind: 'state.agreed' },
        {
          type: 'button',
          props: { label: 'Continue', disabled: '{!state.agreed}' },
          on_click: { action: 'toast', message: 'Continuing…', variant: 'info' },
        },
      ],
    },
  },
};
