import type { WidgetManifestEntry } from '../index.js';

export const timelineEntry: WidgetManifestEntry = {
  type: 'timeline',
  category: 'research',
  description:
    'Vertical timeline with typed events, dates, and optional details. Use density:"compact" for activity streams; default reads as a milestone log.',
  props: {
    events: {
      type: 'Array<{ date: string; title: string; detail?: string; type?: "default" | "success" | "warning" | "error" | "info"; color?: string }>',
      required: true,
      description: 'Timeline events.',
    },
    maxItems: { type: 'number', required: false, description: 'Truncate after N events.' },
    density: {
      type: '"comfortable" | "compact"',
      required: false,
      description:
        'Visual density. "comfortable" (default) shows a connecting rail and roomy spacing — milestones/roadmap. "compact" hides the rail and tightens rows — activity streams ("Deploy succeeded · 2m ago").',
    },
  },
  example: {
    type: 'timeline',
    props: {
      events: [
        { date: 'Q1 2026', title: 'Product Launch', detail: 'Shipped new ML features.', type: 'success' },
        { date: 'Q2 2025', title: 'Series B Funding', detail: '$50M raised from leading VCs.', type: 'success' },
        { date: 'Q4 2024', title: 'Market Expansion', detail: 'Entered 5 new countries.', type: 'info' },
      ],
    },
  },
};
