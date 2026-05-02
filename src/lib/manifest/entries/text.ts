// ripple/src/lib/manifest/entries/text.ts
import type { WidgetManifestEntry } from '../index.js';

export const textEntry: WidgetManifestEntry = {
  type: 'text',
  category: 'display',
  description: 'Inline text or paragraph. Use for prose, labels, captions, descriptions.',
  props: {
    content: { type: 'string', required: true, description: 'The text to display. Supports {state.path} expressions.' },
    variant: { type: '"body" | "muted" | "caption"', required: false, description: 'Visual style. Defaults to body.' },
  },
  example: { type: 'text', props: { content: 'Total revenue this quarter.', variant: 'muted' } },
};
