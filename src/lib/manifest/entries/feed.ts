import type { WidgetManifestEntry } from '../index.js';

export const feedEntry: WidgetManifestEntry = {
  type: 'feed',
  category: 'display',
  description: 'Timeline activity feed with colored dots, text, and optional timestamps.',
  props: {
    items: {
      type: 'Array<{ text: string; time?: string; dot?: string; type?: "default" | "success" | "warning" | "error" | "info" }>',
      required: true,
      description: 'Feed items in display order.',
    },
    maxItems: { type: 'number', required: false, description: 'Truncate after N items.' },
  },
  example: {
    type: 'feed',
    props: {
      items: [
        { text: 'Deployment completed', time: '2m ago', type: 'success' },
        { text: 'Tests passed', time: '5m ago', type: 'success' },
        { text: 'Build started', time: '8m ago', type: 'info' },
      ],
    },
  },
};
