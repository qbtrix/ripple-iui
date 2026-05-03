import type { WidgetManifestEntry } from '../index.js';

export const codeEditorEntry: WidgetManifestEntry = {
  type: 'code-editor',
  category: 'input',
  description: 'Code editor with syntax highlighting (CodeMirror). Use for editable code blocks.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path for code content.' },
    value: { type: 'string', required: false, description: 'Code content.' },
    language: { type: '"javascript" | "typescript" | "json" | "html" | "text"', required: false, description: 'Language for highlighting.' },
    height: { type: 'string', required: false, description: 'Editor height. Default "240px".' },
    readonly: { type: 'boolean', required: false, description: 'Make read-only.' },
    placeholder: { type: 'string', required: false, description: 'Placeholder text.' },
    on_change: { type: 'EventAction', required: false, description: 'Fired on code change.' },
  },
  example: { type: 'code-editor', props: { label: 'JSON config', language: 'json', height: '300px', bind: '{state.jsonConfig}' } },
};
