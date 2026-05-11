import type { WidgetManifestEntry } from '../index.js';

export const segmentedEntry: WidgetManifestEntry = {
  type: 'segmented',
  category: 'input',
  description: 'Segmented control (toggle group). Use for view switching or compact single/multi-select.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path, e.g. "{state.viewMode}".' },
    value: { type: 'string | number | (string | number)[]', required: false, description: 'Selected value (or array if multiple).' },
    options: { type: 'string[] | Array<{ value: string | number; label: string; icon?: string; disabled?: boolean }>', required: true, description: 'Segment options.' },
    multiple: { type: 'boolean', required: false, description: 'Allow multiple selections.' },
    size: { type: '"sm" | "md"', required: false, description: 'Button size.' },
    disabled: { type: 'boolean', required: false, description: 'Disable all buttons.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired on selection change.' },
  },
  example: {
    type: 'segmented',
    props: {
      label: 'View',
      options: [
        { value: 'list', label: 'List', icon: 'list' },
        { value: 'grid', label: 'Grid', icon: 'grid' },
      ],
      bind: '{state.viewMode}',
    },
  },
};
