import type { WidgetManifestEntry } from '../index.js';

export const stepsEntry: WidgetManifestEntry = {
  type: 'steps',
  category: 'display',
  description: 'Numbered process steps — vertical (default) or horizontal — with optional descriptions.',
  props: {
    steps: { type: 'Array<{ title: string; description?: string; number?: number | string }>', required: true, description: 'Step items.' },
    orientation: { type: '"vertical" | "horizontal"', required: false, description: 'Layout direction.' },
  },
  example: {
    type: 'steps',
    props: {
      orientation: 'vertical',
      steps: [
        { title: 'Install dependencies', description: 'Run `npm install`.' },
        { title: 'Configure settings', description: 'Update `config.json`.' },
        { title: 'Deploy', description: 'Push to production.' },
      ],
    },
  },
};
