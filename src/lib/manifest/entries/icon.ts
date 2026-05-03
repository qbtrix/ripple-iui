import type { WidgetManifestEntry } from '../index.js';

export const iconEntry: WidgetManifestEntry = {
  type: 'icon',
  category: 'display',
  description: 'Lucide SVG icon (lazy-loaded). Use kebab-case slug, e.g. `chevron-right`.',
  props: {
    name: { type: 'string', required: true, description: 'Lucide icon slug (kebab-case).' },
    size: { type: 'number', required: false, description: 'Icon size in pixels. Default 16.' },
    strokeWidth: { type: 'number', required: false, description: 'Stroke width. Default 2.' },
    color: { type: 'string', required: false, description: 'Icon color (CSS color).' },
  },
  example: { type: 'icon', props: { name: 'check-circle', size: 24, color: '#10b981' } },
};
