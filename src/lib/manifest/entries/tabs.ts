import type { WidgetManifestEntry } from '../index.js';

export const tabsEntry: WidgetManifestEntry = {
  type: 'tabs',
  category: 'layout',
  description: 'Tabbed interface with switchable panels. Pass tabs array; per-tab content goes in panels or children.',
  props: {
    tabs: { type: 'Array<{ value: string; label: string }>', required: true, description: 'Tab definitions in display order.' },
    defaultValue: { type: 'string', required: false, description: 'Initially active tab value.' },
    value: { type: 'string', required: false, description: 'Controlled active tab value (use with bind).' },
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
  },
};
