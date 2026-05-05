import type { WidgetManifestEntry } from '../index.js';

export const definitionListEntry: WidgetManifestEntry = {
  type: 'definition-list',
  category: 'display',
  description: 'Term/definition pairs — inline (term-on-left) or stacked. Use for glossaries and metadata.',
  props: {
    items: { type: 'Array<{ term: string; definition: string }>', required: true, description: 'Term/definition pairs.' },
    layout: { type: '"inline" | "stacked"', required: false, description: 'Layout mode.' },
  },
  example: {
    type: 'definition-list',
    props: {
      layout: 'inline',
      items: [
        { term: 'API', definition: 'Application Programming Interface' },
        { term: 'REST', definition: 'Representational State Transfer' },
      ],
    },
  },
};
