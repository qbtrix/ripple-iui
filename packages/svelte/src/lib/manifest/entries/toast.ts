import type { WidgetManifestEntry } from '../index.js';

export const toastEntry: WidgetManifestEntry = {
  type: 'toast',
  category: 'overlay',
  description: 'Toast container that displays dismissible notifications at a screen corner. Mount once near the root.',
  props: {
    position: { type: '"top-right" | "top-left" | "bottom-right" | "bottom-left"', required: false, description: 'Screen position. Default "top-right".' },
    max: { type: 'number', required: false, description: 'Max visible toasts. Default 5.' },
  },
  example: { type: 'toast', props: { position: 'top-right', max: 5 } },
};
