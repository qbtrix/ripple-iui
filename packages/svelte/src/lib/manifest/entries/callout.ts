import type { WidgetManifestEntry } from '../index.js';

export const calloutEntry: WidgetManifestEntry = {
  type: 'callout',
  category: 'research',
  description: 'Colored callout box with icon, title, and body. Use to highlight insights, warnings, or summaries.',
  props: {
    text: { type: 'string', required: true, description: 'Body text.' },
    title: { type: 'string', required: false, description: 'Callout title.' },
    variant: { type: '"info" | "success" | "warning" | "insight"', required: false, description: 'Variant.' },
  },
  example: { type: 'callout', props: { variant: 'insight', title: 'Key Insight', text: 'Revenue growth accelerated to 45% YoY, driven by enterprise adoption.' } },
};
