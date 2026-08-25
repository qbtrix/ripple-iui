import type { WidgetManifestEntry } from '../index.js';

export const sectionEntry: WidgetManifestEntry = {
  type: 'section',
  category: 'layout',
  description: 'Content section with optional title and description header. Use for logical page grouping.',
  props: {
    title: { type: 'string', required: false, description: 'Section title.' },
    description: { type: 'string', required: false, description: 'Section description.' },
  },
  example: {
    type: 'section',
    props: { title: 'Recent activity', description: 'Past 7 days' },
    children: [
      {
        type: 'timeline',
        props: {
          density: 'compact',
          events: [
            { date: '2m ago', title: 'Deploy succeeded', type: 'success' },
            { date: '14m ago', title: 'PR merged', type: 'info' },
          ],
        },
      },
    ],
  },
};
