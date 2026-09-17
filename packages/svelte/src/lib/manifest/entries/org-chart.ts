import type { WidgetManifestEntry } from '../index.js';

export const orgChartEntry: WidgetManifestEntry = {
  type: 'org-chart',
  category: 'vertical',
  description: 'Recursive org chart with manager cards (avatars + titles). Supports multi-level nesting.',
  props: {
    root: { type: '{ id: string | number; name: string; title?: string; avatar?: string; children?: Node[] } | null', required: true, description: 'Root node with nested children.' },
    value: { type: 'string | number | null', required: false, description: 'Selected node id (use with bind).' },
  },
  example: {
    type: 'org-chart',
    props: {
      root: {
        id: 'ceo',
        name: 'Diana Martinez',
        title: 'Chief Executive Officer',
        children: [
          {
            id: 'cto',
            name: 'Edward Chen',
            title: 'CTO',
            children: [
              { id: 'eng-lead', name: 'Fatima Al-Rashid', title: 'Engineering Lead' },
              { id: 'qa-lead', name: 'Gabriel Santos', title: 'QA Lead' },
            ],
          },
          { id: 'cfo', name: 'Hannah Park', title: 'CFO', children: [{ id: 'controller', name: 'Isaac Lincoln', title: 'Controller' }] },
        ],
      },
    },
  },
};
