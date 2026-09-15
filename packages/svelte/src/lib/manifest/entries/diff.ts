import type { WidgetManifestEntry } from '../index.js';

export const diffEntry: WidgetManifestEntry = {
  type: 'diff',
  category: 'display',
  description: 'Text diff viewer — unified or split, with line/word/char granularity.',
  props: {
    before: { type: 'string', required: false, description: '"Before" text.' },
    after: { type: 'string', required: false, description: '"After" text.' },
    mode: { type: '"lines" | "words" | "chars"', required: false, description: 'Diff granularity.' },
    layout: { type: '"unified" | "split"', required: false, description: 'View layout.' },
    showLineNumbers: { type: 'boolean', required: false, description: 'Show line numbers (lines mode only).' },
    title: { type: 'string', required: false, description: 'Header title.' },
  },
  example: { type: 'diff', props: { before: 'const x = 1;', after: 'const x = 42;', mode: 'lines', layout: 'unified', showLineNumbers: true } },
};
