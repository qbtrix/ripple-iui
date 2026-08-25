import type { WidgetManifestEntry } from '../index.js';

export const modalEntry: WidgetManifestEntry = {
  type: 'modal',
  category: 'layout',
  description: 'Dialog overlay with controlled open state, header, and dismissal. Sizes: sm/md/lg.',
  props: {
    value: { type: 'boolean', required: false, description: 'Open state. Use with bind for two-way control.' },
    title: { type: 'string', required: false, description: 'Modal header title.' },
    description: { type: 'string', required: false, description: 'Modal header description.' },
    size: { type: '"sm" | "md" | "lg"', required: false, description: 'Width constraint. Default "md".' },
  },
  example: {
    type: 'modal',
    props: { value: false, title: 'Delete project?', description: 'This cannot be undone.', size: 'sm' },
    children: [
      { type: 'text', props: { text: 'All data will be permanently removed.' } },
    ],
  },
  pocket: {
    state: { settingsOpen: false, theme: 'light' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'button',
          props: { label: 'Open settings' },
          on_click: { action: 'open', target: 'settingsOpen' },
        },
        {
          type: 'modal',
          props: { title: 'Settings', description: 'Personalize your experience.', size: 'sm' },
          bind: 'state.settingsOpen',
          children: [
            {
              type: 'radio-group',
              props: {
                label: 'Theme',
                options: [
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ],
              },
              bind: 'state.theme',
            },
            {
              type: 'button',
              props: { label: 'Done' },
              on_click: { action: 'set', target: 'settingsOpen', value: false },
            },
          ],
        },
      ],
    },
  },
};
