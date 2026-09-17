import type { WidgetManifestEntry } from '../index.js';

export const sourceCardEntry: WidgetManifestEntry = {
  type: 'source-card',
  category: 'research',
  description: 'Source card with publisher, headline, and favicon. Use in card grids for articles or research.',
  props: {
    source: { type: 'string', required: true, description: 'Publisher name.' },
    title: { type: 'string', required: true, description: 'Headline text.' },
    color: { type: 'string', required: false, description: 'Accent color (CSS) — used if favicon fails.' },
    favicon: { type: 'string', required: false, description: 'Favicon URL override.' },
    url: { type: 'string', required: false, description: 'Link URL.' },
  },
  example: { type: 'source-card', props: { source: 'TechCrunch', title: 'AI Startup Raises $50M Series B', color: '#ff6b35', url: 'https://techcrunch.com/article' } },
};
