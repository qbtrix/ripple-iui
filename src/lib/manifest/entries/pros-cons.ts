import type { WidgetManifestEntry } from '../index.js';

export const prosConsEntry: WidgetManifestEntry = {
  type: 'pros-cons',
  category: 'display',
  description: 'Two-column pros vs. cons comparison with checkmark/X icons.',
  props: {
    pros: { type: 'string[]', required: false, description: 'Pros list.' },
    cons: { type: 'string[]', required: false, description: 'Cons list.' },
    prosLabel: { type: 'string', required: false, description: 'Pros column header.' },
    consLabel: { type: 'string', required: false, description: 'Cons column header.' },
  },
  example: {
    type: 'pros-cons',
    props: {
      pros: ['Easy to learn', 'Great performance', 'Strong ecosystem'],
      cons: ['Steep advanced curve', 'Limited mobile support'],
    },
  },
};
