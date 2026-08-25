import type { WidgetManifestEntry } from '../index.js';

export const articleMetaEntry: WidgetManifestEntry = {
  type: 'article-meta',
  category: 'display',
  description: 'Article byline — author, avatar, publish date, read time.',
  props: {
    author: { type: 'string', required: false, description: 'Author name.' },
    avatar: { type: 'string', required: false, description: 'Author avatar URL.' },
    role: { type: 'string', required: false, description: 'Author role.' },
    date: { type: 'string', required: false, description: 'Publication date.' },
    readTime: { type: 'string', required: false, description: 'Read time estimate (e.g. "8 min").' },
  },
  example: { type: 'article-meta', props: { author: 'Jane Doe', date: 'May 3, 2026', readTime: '8 min read' } },
};
