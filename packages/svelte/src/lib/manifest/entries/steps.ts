import type { WidgetManifestEntry } from '../index.js';

export const stepsEntry: WidgetManifestEntry = {
  type: 'steps',
  category: 'display',
  description: 'Numbered process steps — vertical (default) or horizontal — with optional descriptions and a per-step status (done, current, upcoming, failed).',
  props: {
    steps: {
      type: "Array<{ title: string; description?: string; number?: number | string; status?: 'done' | 'current' | 'upcoming' | 'failed' }>",
      required: true,
      description: 'Step items. `status` marks progress: done and failed pips show a check or cross, the current step is announced as current. Omit it for a plain numbered list.',
    },
    orientation: { type: '"vertical" | "horizontal"', required: false, description: 'Layout direction.' },
  },
  example: {
    type: 'steps',
    props: {
      orientation: 'vertical',
      steps: [
        { title: 'Install dependencies', description: 'Run `npm install`.', status: 'done' },
        { title: 'Configure settings', description: 'Update `config.json`.', status: 'current' },
        { title: 'Deploy', description: 'Push to production.', status: 'upcoming' },
      ],
    },
  },
};
