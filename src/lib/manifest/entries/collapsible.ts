import type { WidgetManifestEntry } from '../index.js';

export const collapsibleEntry: WidgetManifestEntry = {
  type: 'collapsible',
  category: 'layout',
  description: 'Single collapsible container with toggle trigger. Controlled or uncontrolled open state.',
  props: {
    title: { type: 'string', required: false, description: 'Trigger button label.' },
    value: { type: 'boolean', required: false, description: 'Controlled open state.' },
    defaultOpen: { type: 'boolean', required: false, description: 'Initial open state when uncontrolled. Default false.' },
    hideChevron: { type: 'boolean', required: false, description: 'Hide chevron indicator. Default false.' },
  },
  example: {
    type: 'collapsible',
    props: { title: 'Show advanced options', defaultOpen: false },
    children: [
      { type: 'text', props: { text: 'Advanced settings here.' } },
    ],
  },
};
