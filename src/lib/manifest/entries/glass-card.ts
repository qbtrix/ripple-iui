import type { WidgetManifestEntry } from '../index.js';

export const glassCardEntry: WidgetManifestEntry = {
  type: 'glass-card',
  category: 'layout',
  description: 'Glass-morphism container with customizable blur, opacity, and tint. Use for premium overlays.',
  props: {
    title: { type: 'string', required: false, description: 'Card title.' },
    description: { type: 'string', required: false, description: 'Card description.' },
    opacity: { type: 'number', required: false, description: 'Background opacity 0-100. Default 38.' },
    blur: { type: 'number', required: false, description: 'Blur radius in px. Default 8.' },
    tint: { type: 'string', required: false, description: 'Tint color hex. Default #000000.' },
    borderGlow: { type: 'boolean', required: false, description: 'Enable reflex border glow. Default true.' },
  },
  example: {
    type: 'glass-card',
    props: { title: 'Pro tier', opacity: 40, blur: 12 },
    children: [
      { type: 'text', props: { content: '$48/month' } },
    ],
  },
};
