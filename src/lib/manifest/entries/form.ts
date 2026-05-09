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
  },
  events: {
    on_submit: { type: 'EventAction', required: false, description: 'Fired when a valid form is submitted.' },
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
  pockets: [
    {
      name: 'validate-and-emit',
      description: 'Client-side validation, then hand off to the host via emit.',
      state: { email: '', password: '', errors: {} },
      ui: {
        type: 'form',
        props: {
          fields: {
            email: { required: 'Email is required', minLength: 5 },
            password: { required: 'Password is required', minLength: 8 },
          },
          validateOn: 'submit',
        },
        on_submit: { action: 'emit', target: 'login', value: { email: '{state.email}', password: '{state.password}' } },
        children: [
          { type: 'input', props: { label: 'Email', type: 'email' }, bind: 'state.email' },
          { type: 'input', props: { label: 'Password', type: 'password' }, bind: 'state.password' },
          { type: 'button', props: { label: 'Sign in', type: 'submit' } },
        ],
      },
    },
    {
      name: 'validate-and-api',
      description: 'Validate, call API, toast on success or failure.',
      state: { name: '', email: '', submitting: false, errors: {} },
      ui: {
        type: 'form',
        props: {
          fields: {
            name: { required: 'Name is required' },
            email: { required: 'Email is required', minLength: 5 },
          },
          validateOn: 'submit',
        },
        on_submit: {
          action: 'flow',
          steps: [
            { action: 'set', target: 'submitting', value: true },
            {
              action: 'api',
              method: 'POST',
              url: '/api/contacts',
              body: { name: '{state.name}', email: '{state.email}' },
              on_success: [
                { action: 'set', target: 'submitting', value: false },
                { action: 'set', target: 'name', value: '' },
                { action: 'set', target: 'email', value: '' },
                { action: 'toast', message: 'Contact saved', variant: 'success' },
              ],
              on_error: [
                { action: 'set', target: 'submitting', value: false },
                { action: 'toast', message: 'Could not save', variant: 'error' },
              ],
            },
          ],
        },
        children: [
          { type: 'input', props: { label: 'Name' }, bind: 'state.name' },
          { type: 'input', props: { label: 'Email', type: 'email' }, bind: 'state.email' },
          { type: 'button', props: { label: '{state.submitting ? "Saving…" : "Save"}', loading: '{state.submitting}', type: 'submit' } },
        ],
      },
    },
  ],
};
