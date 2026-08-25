import type { WidgetManifestEntry } from '../index.js';

export const eachEntry: WidgetManifestEntry = {
  type: 'each',
  category: 'control',
  description: 'Loop over an array. Renders children per item with `{item}` and `{index}` in expressions. `items`/`item_as`/`index_as` are node-level fields, not props.',
  props: {},
  nodeFields: {
    items: { type: 'string', required: true, description: 'State path or expression resolving to an array, e.g. "{state.users}".' },
    item_as: { type: 'string', required: false, description: 'Variable name for the current item. Default "item".' },
    index_as: { type: 'string', required: false, description: 'Variable name for the current index. Default "index".' },
  },
  example: {
    type: 'each',
    items: '{state.users}',
    children: [
      { type: 'text', props: { text: '{item.name}' } },
    ],
  },
};
