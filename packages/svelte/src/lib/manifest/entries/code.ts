import type { WidgetManifestEntry } from '../index.js';

export const codeEntry: WidgetManifestEntry = {
  type: 'code',
  category: 'display',
  description: 'Inline monospace code snippet. Use `code-block` for multi-line fenced blocks.',
  props: {
    value: { type: 'string', required: true, description: 'Code text.' },
  },
  example: { type: 'code', props: { value: 'npm install' } },
};
