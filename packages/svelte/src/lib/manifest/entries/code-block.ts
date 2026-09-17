import type { WidgetManifestEntry } from '../index.js';

export const codeBlockEntry: WidgetManifestEntry = {
  type: 'code-block',
  category: 'display',
  description:
    'Fenced code block with line numbers, light syntax highlighting, a language label and a copy button. Long lines wrap rather than scrolling.',
  props: {
    code: { type: 'string', required: false, description: 'Code source.' },
    text: { type: 'string', required: false, description: 'Alias for code.' },
    language: { type: 'string', required: false, description: 'Language slug (ts, js, py, sh, etc.).' },
    hideLanguage: { type: 'boolean', required: false, description: 'Hide language label.' },
    hideCopy: { type: 'boolean', required: false, description: 'Hide copy button.' },
  },
  example: { type: 'code-block', props: { code: 'const x = 42;\nconsole.log(x);', language: 'ts' } },
};
