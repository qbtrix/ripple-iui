import type { WidgetManifestEntry } from '../index.js';

export const richTextEntry: WidgetManifestEntry = {
  type: 'rich-text',
  category: 'input',
  description: 'WYSIWYG rich-text editor with formatting toolbar (Tiptap).',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path for HTML content.' },
    value: { type: 'string', required: false, description: 'HTML content.' },
    placeholder: { type: 'string', required: false, description: 'Placeholder text.' },
    hideToolbar: { type: 'boolean', required: false, description: 'Hide formatting toolbar.' },
    minHeight: { type: 'string', required: false, description: 'Min editor height. Default "120px".' },
    maxHeight: { type: 'string', required: false, description: 'Max editor height (scrollable). Default "320px".' },
    on_change: { type: 'EventAction', required: false, description: 'Fired on content change.' },
  },
  example: { type: 'rich-text', props: { label: 'Article body', placeholder: 'Write your article…', minHeight: '200px', bind: '{state.articleBody}' } },
};
