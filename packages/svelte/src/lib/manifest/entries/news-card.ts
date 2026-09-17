import type { WidgetManifestEntry } from '../index.js';

export const newsCardEntry: WidgetManifestEntry = {
  type: 'news-card',
  category: 'research',
  description: 'News article card with headline, source, timestamp, sentiment tag, and optional thumbnail.',
  props: {
    headline: { type: 'string', required: true, description: 'Article headline.' },
    source: { type: 'string', required: false, description: 'Publisher name.' },
    time: { type: 'string', required: false, description: 'Time (relative or absolute).' },
    sentiment: { type: '"bullish" | "bearish" | "neutral"', required: false, description: 'Sentiment tag.' },
    image: { type: 'string', required: false, description: 'Thumbnail URL.' },
    url: { type: 'string', required: false, description: 'Article URL.' },
  },
  example: { type: 'news-card', props: { headline: 'Fed Raises Interest Rates to Combat Inflation', source: 'Financial Times', time: '2 hours ago', sentiment: 'bearish', url: 'https://ft.com/article' } },
};
