import type { WidgetManifestEntry } from '../index.js';

export const codeBlockEntry: WidgetManifestEntry = {
  type: 'code-block',
  category: 'display',
  description:
    'Fenced code block with line numbers, light syntax highlighting, a file title, a language label and a copy button. Long lines wrap rather than scrolling.',
  props: {
    code: { type: 'string', required: false, description: 'Code source.' },
    text: { type: 'string', required: false, description: 'Alias for code.' },
    language: { type: 'string', required: false, description: 'Language slug (ts, js, py, sh, etc.). Without one the code is left uncoloured.' },
    title: { type: 'string', required: false, description: 'File name in the header, with the language label beside it.' },
    hideLanguage: { type: 'boolean', required: false, description: 'Hide language label.' },
    hideCopy: { type: 'boolean', required: false, description: 'Hide copy button.' },
    startLine: { type: 'number', required: false, description: 'Number of the first line, for an excerpt of a longer file. Default 1.' },
    highlight: { type: '[number, number]', required: false, description: 'Inclusive [first, last] line numbers to tint.' },
    highlightTone: { type: '"accent" | "added" | "removed"', required: false, description: 'Tint of the highlighted range. Default accent.' },
    compact: { type: 'boolean', required: false, description: 'Tighter header, padding and leading, for a side panel.' },
  },
  example: {
    type: 'code-block',
    props: {
      code: 'const x = 42;\nconsole.log(x);',
      language: 'ts',
      title: 'answer.ts',
      startLine: 12,
      highlight: [13, 13],
    },
  },
};
