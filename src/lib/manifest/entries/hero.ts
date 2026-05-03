import type { WidgetManifestEntry } from '../index.js';

export const heroEntry: WidgetManifestEntry = {
  type: 'hero',
  category: 'layout',
  description: 'Large hero section with title, subtitle, eyebrow text, and alignment options. Use for landing intros.',
  props: {
    title: { type: 'string', required: true, description: 'Hero title.' },
    subtitle: { type: 'string', required: false, description: 'Subtitle description.' },
    eyebrow: { type: 'string', required: false, description: 'Eyebrow text above title.' },
    align: { type: '"left" | "center"', required: false, description: 'Text alignment. Default "left".' },
  },
  example: {
    type: 'hero',
    props: { title: 'Build interfaces from JSON', subtitle: 'Ripple turns specs into Svelte UIs.', align: 'center' },
  },
};
