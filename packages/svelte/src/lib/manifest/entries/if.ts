import type { WidgetManifestEntry } from '../index.js';

export const ifEntry: WidgetManifestEntry = {
  type: 'if',
  category: 'control',
  description: 'Conditional rendering. Renders children only when `condition` is truthy. `condition` is a node-level field, not a prop.',
  props: {},
  nodeFields: {
    condition: { type: 'string', required: true, description: 'Expression evaluated for truthiness, e.g. "{state.isAdmin}".' },
    else_children: { type: 'UINode[]', required: false, description: 'Rendered instead of `children` when `condition` is falsy.' },
  },
  example: {
    type: 'if',
    condition: '{state.isAdmin}',
    children: [
      { type: 'text', props: { text: 'Admin section' } },
    ],
    else_children: [
      { type: 'text', props: { text: 'Ask an admin for access.' } },
    ],
  },
};
