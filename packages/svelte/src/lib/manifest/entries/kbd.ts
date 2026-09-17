import type { WidgetManifestEntry } from '../index.js';

export const kbdEntry: WidgetManifestEntry = {
  type: 'kbd',
  category: 'display',
  description: 'Inline keyboard shortcut hint, e.g. ⌘K.',
  props: {
    keys: { type: 'string | string[]', required: true, description: 'Key(s) to display.' },
    separator: { type: 'string', required: false, description: 'Separator between keys. Default "+".' },
  },
  example: { type: 'kbd', props: { keys: ['Cmd', 'K'] } },
};
