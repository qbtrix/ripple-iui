import type { WidgetManifestEntry } from '../index.js';

export const calendarEntry: WidgetManifestEntry = {
  type: 'calendar',
  category: 'data',
  description: 'Interactive month/week calendar with event visualization and date selection.',
  props: {
    events: { type: 'Array<{ id: string | number; title: string; start: string; end?: string; color?: string }>', required: false, description: 'Events with ISO dates.' },
    view: { type: '"month" | "week"', required: false, description: 'Display mode.' },
    value: { type: 'string | null', required: false, description: 'Selected ISO date (use with bind).' },
    locale: { type: 'string', required: false, description: 'Locale code. Default "en-US".' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired on date selection.' },
    on_select: { type: 'EventAction', required: false, description: 'Fired when an event is clicked.' },
  },
  example: {
    type: 'calendar',
    props: {
      view: 'month',
      events: [
        { id: 1, title: 'Sprint Start', start: '2026-05-05', color: '#3b82f6' },
        { id: 2, title: 'Review', start: '2026-05-12', color: '#8b5cf6' },
        { id: 3, title: 'Release', start: '2026-05-19', color: '#22c55e' },
      ],
    },
  },
  pocket: {
    state: {
      selectedDate: '2026-05-12',
      events: [
        { id: 1, title: 'Sprint Start', start: '2026-05-05', color: '#3b82f6' },
        { id: 2, title: 'Review', start: '2026-05-12', color: '#8b5cf6' },
        { id: 3, title: 'Release', start: '2026-05-19', color: '#22c55e' },
      ],
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'calendar', props: { view: 'month', events: '{state.events}' }, bind: 'state.selectedDate' },
        { type: 'text', props: { text: 'Selected: {state.selectedDate}' } },
      ],
    },
  },
};
