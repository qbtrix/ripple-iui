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
    action: { type: 'string', required: false, description: 'Native submit URL. When set, the form does a real browser POST/GET so it works with NO client JS — for static / prerendered hosts. When omitted, the form stays client-side (validate then on_submit).' },
    method: { type: '"post" | "get"', required: false, description: 'HTTP method for the native form. Only used with `action`. Default "post".' },
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
      name: 'native-post-static',
      description: 'Native browser POST — works with no client JS. For static / prerendered hosts (paw-sites). The form submits straight to `action`; inputs serialize by their `name`.',
      state: {},
      ui: {
        type: 'form',
        props: { action: '/api/submit', method: 'post' },
        children: [
          { type: 'input', props: { label: 'Your name', name: 'full_name' } },
          { type: 'input', props: { label: 'Phone', name: 'phone' } },
          { type: 'button', props: { label: 'Request appointment', type: 'submit', variant: 'primary' } },
        ],
      },
    },
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
