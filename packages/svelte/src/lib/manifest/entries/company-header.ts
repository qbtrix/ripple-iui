import type { WidgetManifestEntry } from '../index.js';

export const companyHeaderEntry: WidgetManifestEntry = {
  type: 'company-header',
  category: 'research',
  description: 'Company profile header — logo, name, ticker, exchange, price, description, sector tags, market cap.',
  props: {
    name: { type: 'string', required: true, description: 'Company name.' },
    ticker: { type: 'string', required: false, description: 'Stock ticker.' },
    exchange: { type: 'string', required: false, description: 'Exchange (NASDAQ/NYSE/etc).' },
    description: { type: 'string', required: false, description: 'One-line description.' },
    logo: { type: 'string', required: false, description: 'Logo image URL.' },
    domain: { type: 'string', required: false, description: 'Domain for auto-derived logo.' },
    tags: { type: 'string[]', required: false, description: 'Sector / industry tags.' },
    price: { type: 'string', required: false, description: 'Current stock price.' },
    change: { type: 'string', required: false, description: 'Price change (e.g. "+12.50").' },
    changePercent: { type: 'string', required: false, description: 'Price change percent.' },
    marketCap: { type: 'string', required: false, description: 'Market capitalization.' },
  },
  example: {
    type: 'company-header',
    props: {
      name: 'Apple Inc.',
      ticker: 'AAPL',
      exchange: 'NASDAQ',
      description: 'Designer and manufacturer of consumer electronics.',
      domain: 'apple.com',
      tags: ['Technology', 'Consumer Electronics'],
      price: '$189.45',
      change: '+2.35',
      changePercent: '+1.25%',
      marketCap: '2.95T',
    },
  },
};
