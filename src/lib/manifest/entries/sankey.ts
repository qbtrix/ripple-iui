import type { WidgetManifestEntry } from '../index.js';

export const sankeyEntry: WidgetManifestEntry = {
  type: 'sankey',
  category: 'data',
  description: 'Sankey diagram showing flows between nodes. Use for value streams, user journeys.',
  props: {
    nodes: { type: 'Array<{ name: string }>', required: true, description: 'Node names.' },
    links: { type: 'Array<{ source: string; target: string; value: number }>', required: true, description: 'Flows.' },
    height: { type: 'number', required: false, description: 'Height in px. Default 320.' },
    title: { type: 'string', required: false, description: 'Chart title.' },
    orient: { type: '"horizontal" | "vertical"', required: false, description: 'Flow direction.' },
    curveness: { type: 'number', required: false, description: 'Link curve factor 0-1. Default 0.5.' },
  },
  example: {
    type: 'sankey',
    props: {
      title: 'User Journey',
      nodes: [{ name: 'Landing' }, { name: 'Signup' }, { name: 'Active' }, { name: 'Churn' }],
      links: [
        { source: 'Landing', target: 'Signup', value: 120 },
        { source: 'Signup', target: 'Active', value: 85 },
        { source: 'Active', target: 'Churn', value: 15 },
      ],
    },
  },
};
