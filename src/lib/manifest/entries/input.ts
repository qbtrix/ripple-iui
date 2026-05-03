import type { WidgetManifestEntry } from '../index.js';

export const inputEntry: WidgetManifestEntry = {
  type: 'input',
  category: 'input',
  description: 'Single-line text input with label, error states, and optional helper text.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path, e.g. "{state.email}".' },
    value: { type: 'string', required: false, description: 'Input value.' },
    placeholder: { type: 'string', required: false, description: 'Placeholder text.' },
    type: { type: '"text" | "email" | "password" | "number" | "tel" | "url" | "search" | "date" | "time" | "color"', required: false, description: 'HTML input type.' },
    size: { type: '"sm" | "md" | "lg"', required: false, description: 'Input size.' },
    disabled: { type: 'boolean', required: false, description: 'Disable input.' },
    readOnly: { type: 'boolean', required: false, description: 'Read-only.' },
    required: { type: 'boolean', required: false, description: 'Mark as required.' },
    error: { type: 'string', required: false, description: 'Error message below input.' },
    helper: { type: 'string', required: false, description: 'Helper text below input.' },
    on_input: { type: 'EventAction', required: false, description: 'Fired on every keystroke.' },
    on_change: { type: 'EventAction', required: false, description: 'Fired on blur.' },
  },
  example: { type: 'input', props: { label: 'Email', type: 'email', placeholder: 'you@example.com', bind: '{state.email}', required: true } },
};
