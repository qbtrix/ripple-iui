import type { WidgetManifestEntry } from '../index.js';

export const chipEntry: WidgetManifestEntry = {
  type: 'chip',
  category: 'display',
  // 2026-09-16: was "Pill-shaped tag". The beautiful-ui re-skin moved this to a
  // small square-cornered tint (rounded-md, borderless) and left `badge` as the
  // rounded-full pill, so the old wording sent an LLM to the wrong widget.
  description: 'Small square-cornered tag with optional close button. For a rounded pill, use badge.',
  props: {
    label: { type: 'string', required: true, description: 'Chip text.' },
    variant: { type: '"default" | "primary" | "success" | "warning" | "destructive"', required: false, description: 'Style variant.' },
    size: { type: '"sm" | "md"', required: false, description: 'Size variant.' },
    closable: { type: 'boolean', required: false, description: 'Show X close button.' },
  },
  example: { type: 'chip', props: { label: 'TypeScript', variant: 'primary', closable: true } },
};
