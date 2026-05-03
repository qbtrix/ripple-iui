import type { WidgetManifestEntry } from '../index.js';

export const formEntry: WidgetManifestEntry = {
  type: 'form',
  category: 'input',
  description: 'Form wrapper with integrated validation. Wrap input children and pass validation rules.',
  props: {
    fields: { type: 'Record<string, { required?: boolean | string; minLength?: number; maxLength?: number; min?: number; max?: number; pattern?: string; label?: string }>', required: true, description: 'Validation rules keyed by state path.' },
    errorsTarget: { type: 'string', required: false, description: 'State path for validation errors. Default "errors".' },
    validTarget: { type: 'string', required: false, description: 'State path for overall validity. Default "valid".' },
    validateOn: { type: '"submit" | "change"', required: false, description: 'When validation runs.' },
    on_submit: { type: 'EventAction', required: false, description: 'Fired when valid form is submitted.' },
    on_validate: { type: 'EventAction', required: false, description: 'Fired after each validation run.' },
  },
  example: {
    type: 'form',
    props: {
      fields: {
        'state.email': { required: 'Email is required', minLength: 5 },
        'state.password': { required: true, minLength: 8 },
      },
      validateOn: 'submit',
    },
    children: [
      { type: 'input', props: { label: 'Email', type: 'email', bind: '{state.email}' } },
      { type: 'input', props: { label: 'Password', type: 'password', bind: '{state.password}' } },
      { type: 'button', props: { label: 'Sign in', type: 'submit' } },
    ],
  },
};
