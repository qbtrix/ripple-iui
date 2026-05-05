import type { WidgetManifestEntry } from '../index.js';

export const modalEntry: WidgetManifestEntry = {
  type: 'modal',
  category: 'layout',
  description: 'Dialog overlay with controlled open state, header, and dismissal. Sizes: sm/md/lg.',
  props: {
    value: { type: 'boolean', required: false, description: 'Open state. Use with bind for two-way control.' },
    title: { type: 'string', required: false, description: 'Modal header title.' },
    description: { type: 'string', required: false, description: 'Modal header description.' },
    size: { type: '"sm" | "md" | "lg"', required: false, description: 'Width constraint. Default "md".' },
  },
  example: {
    type: 'modal',
    props: { value: false, title: 'Delete project?', description: 'This cannot be undone.', size: 'sm' },
    children: [
      { type: 'text', props: { text: 'All data will be permanently removed.' } },
    ],
  },
};
