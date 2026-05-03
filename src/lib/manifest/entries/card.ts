import type { WidgetManifestEntry } from '../index.js';

export const cardEntry: WidgetManifestEntry = {
  type: 'card',
  category: 'layout',
  description: 'Styled container with optional header, body, and footer. Variants: default/muted/outlined/selected/glass.',
  props: {
    title: { type: 'string', required: false, description: 'Card header title.' },
    description: { type: 'string', required: false, description: 'Card header description.' },
    variant: { type: '"default" | "muted" | "outlined" | "selected" | "glass"', required: false, description: 'Visual style variant.' },
    density: { type: '"comfortable" | "compact"', required: false, description: 'Padding and gap size.' },
    interactive: { type: 'boolean', required: false, description: 'Enable hover/click cursor.' },
  },
  example: {
    type: 'card',
    props: { title: 'Recent Activity', description: 'Last 24 hours', variant: 'default' },
    children: [
      { type: 'text', props: { content: '12 events' } },
    ],
  },
};
