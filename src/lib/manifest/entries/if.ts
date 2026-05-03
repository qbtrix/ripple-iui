import type { WidgetManifestEntry } from '../index.js';

export const ifEntry: WidgetManifestEntry = {
  type: 'if',
  category: 'control',
  description: 'Conditional rendering. Renders children only when `condition` is truthy.',
  props: {
    condition: { type: 'boolean | string', required: true, description: 'Condition expression, e.g. "{state.isAdmin}".' },
  },
  example: {
    type: 'if',
    props: { condition: '{state.isAdmin}' },
    children: [
      { type: 'text', props: { content: 'Admin section' } },
    ],
  },
};
