// ripple/src/lib/manifest/entries/text.ts
import type { WidgetManifestEntry } from '../index.js';

export const textEntry: WidgetManifestEntry = {
  type: 'text',
  category: 'display',
  description: 'Inline text or paragraph. Use for prose, labels, captions, descriptions.',
  props: {
    text: { type: 'string', required: false, description: 'The text to display. Supports {state.path} expressions. Defaults to empty.' },
    size: { type: '"xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl"', required: false, description: 'Font size. Default "base".' },
    weight: { type: '"normal" | "medium" | "semibold" | "bold"', required: false, description: 'Font weight. Default "normal".' },
    color: { type: 'string', required: false, description: 'Inline CSS color override.' },
    inline: { type: 'boolean', required: false, description: 'Render as <span> instead of <p>.' },
  },
  example: { type: 'text', props: { text: 'Total revenue this quarter.', size: 'sm' } },
};
