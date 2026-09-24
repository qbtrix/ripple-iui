import type { WidgetManifestEntry } from '../index.js';

export const ganttEntry: WidgetManifestEntry = {
  type: 'gantt',
  category: 'data',
  description: 'Gantt chart for project timelines. Tasks have start/end ISO dates, optional dependencies, and progress bars.',
  props: {
    tasks: { type: 'Array<{ id: string; name: string; start: string; end: string; progress?: number; dependencies?: string }>', required: true, description: 'Task definitions (ISO dates YYYY-MM-DD).' },
    viewMode: { type: '"Quarter Day" | "Half Day" | "Day" | "Week" | "Month" | "Year"', required: false, description: 'Time-unit granularity.' },
    height: { type: 'string', required: false, description: 'Container height. Default "320px".' },
  },
  example: {
    type: 'gantt',
    props: {
      viewMode: 'Week',
      tasks: [
        { id: '1', name: 'Design', start: '2026-05-03', end: '2026-05-10', progress: 100 },
        { id: '2', name: 'Development', start: '2026-05-10', end: '2026-05-24', progress: 60, dependencies: '1' },
        { id: '3', name: 'Testing', start: '2026-05-24', end: '2026-05-31', progress: 0 },
      ],
    },
  },
};
