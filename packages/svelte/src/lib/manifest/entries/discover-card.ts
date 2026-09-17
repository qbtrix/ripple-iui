import type { WidgetManifestEntry } from '../index.js';

export const discoverCardEntry: WidgetManifestEntry = {
  type: 'discover-card',
  category: 'research',
  description: 'Discovery card with image, title, description, and source tag. Use for curated articles or recommendations.',
  props: {
    title: { type: 'string', required: true, description: 'Card title.' },
    description: { type: 'string', required: false, description: 'Short description.' },
    image: { type: 'string', required: false, description: 'Image URL.' },
    source: { type: 'string', required: false, description: 'Publisher name.' },
    url: { type: 'string', required: false, description: 'Link URL.' },
  },
  example: { type: 'discover-card', props: { title: 'Cloud Infrastructure Trends for 2026', description: 'Key insights on Kubernetes and edge computing adoption.', source: 'InfoQ', url: 'https://infoq.com/article' } },
};
