import type { WidgetManifestEntry } from '../index.js';

export const tickerEntry: WidgetManifestEntry = {
  type: 'ticker',
  category: 'research',
  description: 'Horizontal ticker strip showing stock symbols, prices, and color-coded changes. Use for market snapshots.',
  props: {
    items: { type: 'Array<{ symbol: string; price: string; change: string; changePercent?: string }>', required: true, description: 'Ticker items.' },
  },
  example: {
    type: 'ticker',
    props: {
      items: [
        { symbol: 'AAPL', price: '$189.45', change: '+2.35', changePercent: '+1.25%' },
        { symbol: 'MSFT', price: '$425.67', change: '-1.23', changePercent: '-0.29%' },
        { symbol: 'GOOGL', price: '$178.90', change: '+3.45', changePercent: '+1.96%' },
      ],
    },
  },
};
