import type { WidgetManifestEntry } from '../index.js';

export const statusDotEntry: WidgetManifestEntry = {
  type: 'status-dot',
  category: 'display',
  description: 'Status indicator dot with online/offline/busy/away presets and optional pulse.',
  props: {
    variant: { type: '"online" | "offline" | "busy" | "away" | "custom"', required: false, description: 'Status preset.' },
    color: { type: 'string', required: false, description: 'Custom dot color (when variant=custom).' },
    label: { type: 'string', required: false, description: 'Status label shown next to dot.' },
    pulse: { type: 'boolean', required: false, description: 'Animate ping effect.' },
    size: { type: 'number', required: false, description: 'Dot size in px. Default 8.' },
  },
  example: { type: 'status-dot', props: { variant: 'online', label: 'Active', pulse: true } },
};
