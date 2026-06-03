import type { WidgetManifestEntry } from '../index.js';

export const coachmarkEntry: WidgetManifestEntry = {
  type: 'coachmark',
  category: 'overlay',
  description: 'Multi-step product tour with highlighted targets, keyboard nav, and progress counter (driver.js).',
  props: {
    steps: { type: 'Array<{ target: string; title?: string; description?: string; side?: "top" | "right" | "bottom" | "left" | "over" }>', required: true, description: 'Tour steps. `target` is a CSS selector.' },
    value: { type: 'boolean', required: false, description: 'Active state. Use with bind to control visibility.' },
    autoStart: { type: 'boolean', required: false, description: 'Start tour on mount.' },
    showButtons: { type: 'boolean', required: false, description: 'Show prev/next chevrons and counter.' },
  },
  example: {
    type: 'coachmark',
    props: {
      autoStart: false,
      steps: [
        { target: '.dashboard-card', title: 'Welcome', description: 'Start exploring your dashboard here.', side: 'bottom' },
        { target: '.search-input', title: 'Search', description: 'Find documents quickly.', side: 'bottom' },
      ],
    },
  },
};
