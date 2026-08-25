import type { WidgetManifestEntry } from '../index.js';

export const codeBlockEntry: WidgetManifestEntry = {
  type: 'code-block',
  category: 'display',
  description: 'Syntax-highlighted fenced code block with language label and copy button.',
  props: {
    code: { type: 'string', required: false, description: 'Code source.' },
    text: { type: 'string', required: false, description: 'Alias for code.' },
    language: { type: 'string', required: false, description: 'Language slug (ts, js, py, sh, etc.).' },
    hideLanguage: { type: 'boolean', required: false, description: 'Hide language label.' },
    hideCopy: { type: 'boolean', required: false, description: 'Hide copy button.' },
  },
  example: { type: 'code-block', props: { code: 'const x = 42;\nconsole.log(x);', language: 'ts' } },
};
