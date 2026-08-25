import type { WidgetManifestEntry } from '../index.js';

export const quoteEntry: WidgetManifestEntry = {
  type: 'quote',
  category: 'display',
  description: 'Blockquote with optional attribution, avatar, and quote glyph.',
  props: {
    text: { type: 'string', required: true, description: 'Quote text.' },
    quote: { type: 'string', required: false, description: 'Alias for text.' },
    author: { type: 'string', required: false, description: 'Author name.' },
    role: { type: 'string', required: false, description: 'Author role/title.' },
    avatar: { type: 'string', required: false, description: 'Avatar image URL.' },
    hideIcon: { type: 'boolean', required: false, description: 'Hide quote glyph.' },
  },
  example: { type: 'quote', props: { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs', role: 'Co-founder, Apple' } },
};
