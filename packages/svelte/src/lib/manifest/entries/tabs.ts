import type { WidgetManifestEntry } from '../index.js';

export const tabsEntry: WidgetManifestEntry = {
  type: 'tabs',
  category: 'layout',
  description:
    'Tabbed panels. Tab labels go in the `tabs` prop; panel content goes in `children` — one child per tab, matched by index (children[0] renders for tabs[0]).',
  props: {
    tabs: {
      type: 'Array<{ value: string; label: string }>',
      required: true,
      description: 'Tab definitions in display order. `value` is the internal id; `label` is shown on the tab trigger.',
    },
    defaultValue: {
      type: 'string',
      required: false,
      description: "Initially active tab's `value`. Defaults to the first tab if omitted.",
    },
    value: {
      type: 'string',
      required: false,
      description: 'Controlled active tab value (use with `bind` to drive from state).',
    },
  },
  example: {
    type: 'tabs',
    props: {
      tabs: [
        { value: 'overview', label: 'Overview' },
        { value: 'activity', label: 'Activity' },
      ],
      defaultValue: 'overview',
    },
    children: [
      // Panel 0 — content for the "overview" tab.
      {
        type: 'flex',
        props: { direction: 'column', gap: '8px' },
        children: [
          { type: 'heading', props: { level: 4, text: 'Project overview' } },
          { type: 'text', props: { text: 'High-level metrics and status here.' } },
        ],
      },
      // Panel 1 — content for the "activity" tab.
      {
        type: 'timeline',
        props: {
          density: 'compact',
          events: [
            { date: '2m ago', title: 'Deploy succeeded', type: 'info' },
            { date: '14m ago', title: 'New PR opened', type: 'info' },
          ],
        },
      },
    ],
  },
};
