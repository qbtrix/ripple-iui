import type { WidgetManifestEntry } from '../index.js';

export const accordionEntry: WidgetManifestEntry = {
  type: 'accordion',
  category: 'layout',
  description: 'Expandable accordion with single or multiple open items. Use for FAQs and progressive disclosure.',
  props: {
    multiple: { type: 'boolean', required: false, description: 'Allow multiple items open at once. Default false.' },
    value: { type: 'string | string[]', required: false, description: 'Currently open item value(s).' },
    items: { type: 'Array<{ value: string; title: string; content: string }>', required: true, description: 'Accordion items.' },
  },
  example: {
    type: 'accordion',
    props: {
      multiple: false,
      items: [
        { value: 'shipping', title: 'How long does shipping take?', content: 'Most orders arrive within 3-5 business days.' },
        { value: 'returns', title: 'What is the return policy?', content: 'Free returns within 30 days of purchase.' },
      ],
    },
  },
};
