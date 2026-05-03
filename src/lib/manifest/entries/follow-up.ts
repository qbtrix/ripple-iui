import type { WidgetManifestEntry } from '../index.js';

export const followUpEntry: WidgetManifestEntry = {
  type: 'follow-up',
  category: 'research',
  description: 'Text input with send button for follow-up questions. Emits an event on submit.',
  props: {
    placeholder: { type: 'string', required: false, description: 'Input placeholder.' },
    submitLabel: { type: 'string', required: false, description: 'Submit button label (sr-only).' },
    event: { type: 'string', required: false, description: 'Event name emitted on submit.' },
  },
  example: { type: 'follow-up', props: { placeholder: 'Ask follow-up', event: 'follow-up' } },
};
