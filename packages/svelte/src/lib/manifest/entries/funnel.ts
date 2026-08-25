import type { WidgetManifestEntry } from '../index.js';

export const funnelEntry: WidgetManifestEntry = {
  type: 'funnel',
  category: 'data',
  description: 'Funnel chart showing stage-wise conversion or drop-off.',
  props: {
    data: { type: 'Array<{ label: string; value: number }>', required: true, description: 'Funnel stages.' },
    height: { type: 'number', required: false, description: 'Height in px. Default 240.' },
    title: { type: 'string', required: false, description: 'Chart title.' },
    colors: { type: 'string[]', required: false, description: 'Custom palette per stage.' },
    sort: { type: '"descending" | "ascending" | "none"', required: false, description: 'Stage sort order.' },
  },
  example: {
    type: 'funnel',
    props: {
      title: 'Sales Funnel',
      data: [
        { label: 'Leads', value: 1000 },
        { label: 'Qualified', value: 620 },
        { label: 'Proposal', value: 280 },
        { label: 'Closed', value: 105 },
      ],
    },
  },
};
