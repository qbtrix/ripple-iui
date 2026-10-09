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
  pocket: {
    state: { tourOpen: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'button',
          props: { label: 'Start tour' },
          on_click: { action: 'open', target: 'tourOpen' },
        },
        { type: 'input', class: 'coachmark-demo-search', props: { placeholder: 'Search documents' } },
        { type: 'text', class: 'coachmark-demo-recent', props: { text: 'Recent: Q3 plan, Launch notes' } },
        {
          type: 'coachmark',
          props: {
            steps: [
              { target: '.coachmark-demo-search', title: 'Search', description: 'Find any document by name.', side: 'bottom' },
              { target: '.coachmark-demo-recent', title: 'Recent', description: 'Pick up where you left off.', side: 'bottom' },
            ],
          },
          bind: 'state.tourOpen',
        },
      ],
    },
  },
};
