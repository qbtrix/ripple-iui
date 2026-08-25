import type { WidgetManifestEntry } from '../index.js';

export const textareaEntry: WidgetManifestEntry = {
  type: 'textarea',
  category: 'input',
  description: 'Multi-line text input with optional label.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path, e.g. "{state.description}".' },
    value: { type: 'string', required: false, description: 'Textarea value.' },
    placeholder: { type: 'string', required: false, description: 'Placeholder text.' },
    rows: { type: 'number', required: false, description: 'Visible rows. Default 3.' },
    disabled: { type: 'boolean', required: false, description: 'Disable textarea.' },
  },
  events: {
    on_input: { type: 'EventAction', required: false, description: 'Fired on every keystroke.' },
    on_change: { type: 'EventAction', required: false, description: 'Fired on blur.' },
  },
  example: { type: 'textarea', props: { label: 'Comments', placeholder: 'Share your thoughts…', rows: 4, bind: '{state.comments}' } },
  pocket: {
    state: { feedback: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'textarea', props: { label: 'Feedback', placeholder: 'Tell us what you think…', rows: 4 }, bind: 'state.feedback' },
        { type: 'text', props: { text: '{state.feedback.length} / 500 characters' } },
      ],
    },
  },
};
