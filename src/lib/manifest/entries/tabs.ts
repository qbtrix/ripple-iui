import type { WidgetManifestEntry } from '../index.js';

export const tabsEntry: WidgetManifestEntry = {
  type: 'tabs',
  category: 'layout',
  description:
    'Tabbed interface with switchable panels. Define tab labels via the `tabs` prop ' +
    "(in display order). Provide tab CONTENT in the node's `children` array — one " +
    'child node per tab, matched by INDEX (children[0] is the panel for tabs[0], etc.). ' +
    'Do NOT nest content inside `props.tabs[i].content` — that field is ignored by the renderer.',
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
        type: 'feed',
        props: {
          items: [
            { text: 'Deploy succeeded', type: 'info' },
            { text: 'New PR opened', type: 'info' },
          ],
        },
      },
    ],
  },
};
