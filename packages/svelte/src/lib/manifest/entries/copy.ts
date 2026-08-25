import type { WidgetManifestEntry } from '../index.js';

export const copyEntry: WidgetManifestEntry = {
  type: 'copy',
  category: 'display',
  description: 'Copy-to-clipboard button with visual confirmation.',
  props: {
    value: { type: 'string', required: true, description: 'Text to copy.' },
    label: { type: 'string', required: false, description: 'Button label.' },
    size: { type: '"sm" | "md"', required: false, description: 'Button size.' },
  },
  example: { type: 'copy', props: { value: 'npm install @ripple-ui/svelte', label: 'Copy install command' } },
};
