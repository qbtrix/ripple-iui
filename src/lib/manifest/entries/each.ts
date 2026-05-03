import type { WidgetManifestEntry } from '../index.js';

export const eachEntry: WidgetManifestEntry = {
  type: 'each',
  category: 'control',
  description: 'Loop over an array. Renders children per item with `{item}` and `{index}` available in expressions.',
  props: {
    items: { type: 'unknown[] | string', required: true, description: 'Array literal or expression resolving to an array, e.g. "{state.users}".' },
    item_as: { type: 'string', required: false, description: 'Variable name for the item. Default "item".' },
    index_as: { type: 'string', required: false, description: 'Variable name for the index. Default "index".' },
  },
  example: {
    type: 'each',
    props: { items: '{state.users}' },
    children: [
      { type: 'text', props: { content: '{item.name}' } },
    ],
  },
};
