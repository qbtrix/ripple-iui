import type { WidgetManifestEntry } from '../index.js';

export const analystBarEntry: WidgetManifestEntry = {
  type: 'analyst-bar',
  category: 'research',
  description: 'Analyst recommendation bar — Buy/Hold/Sell distribution with consensus label and target price.',
  props: {
    buy: { type: 'number', required: true, description: 'Buy/Overweight ratings count.' },
    hold: { type: 'number', required: true, description: 'Hold ratings count.' },
    sell: { type: 'number', required: true, description: 'Sell/Underweight ratings count.' },
    consensus: { type: 'string', required: false, description: 'Consensus label (e.g. "Strong Buy").' },
    target: { type: 'string', required: false, description: 'Average target price.' },
  },
  example: { type: 'analyst-bar', props: { buy: 18, hold: 8, sell: 2, consensus: 'Strong Buy', target: '$210.50' } },
};
