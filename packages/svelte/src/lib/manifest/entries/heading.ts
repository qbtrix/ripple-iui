// ripple/src/lib/manifest/entries/heading.ts
import type { WidgetManifestEntry } from '../index.js';

export const headingEntry: WidgetManifestEntry = {
  type: 'heading',
  category: 'display',
  description: 'Section title at h1-h6 levels. Use for page titles and section headers.',
  props: {
    text: { type: 'string', required: true, description: 'The heading text.' },
    level: { type: '1 | 2 | 3 | 4 | 5 | 6', required: false, description: 'Heading level. Defaults to 2.' },
  },
  example: { type: 'heading', props: { text: 'Q2 Performance', level: 2 } },
};
