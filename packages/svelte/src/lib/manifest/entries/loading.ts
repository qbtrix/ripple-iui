import type { WidgetManifestEntry } from '../index.js';

export const loadingEntry: WidgetManifestEntry = {
  type: 'loading',
  category: 'display',
  description: 'Spinner with optional label. Inline pill or centered block.',
  props: {
    size: { type: 'number', required: false, description: 'Icon size in px. Default 16.' },
    label: { type: 'string', required: false, description: 'Loading text.' },
    inline: { type: 'boolean', required: false, description: 'Inline (true) or centered block (false).' },
    showLabel: { type: 'boolean', required: false, description: 'Render label visually (default screen-reader-only).' },
  },
  example: { type: 'loading', props: { size: 20, label: 'Processing…', inline: true, showLabel: true } },
};
