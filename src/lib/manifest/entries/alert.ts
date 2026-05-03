import type { WidgetManifestEntry } from '../index.js';

export const alertEntry: WidgetManifestEntry = {
  type: 'alert',
  category: 'overlay',
  description: 'Alert box with title, description, and visual variant (info/success/warning/destructive).',
  props: {
    title: { type: 'string', required: false, description: 'Alert title.' },
    description: { type: 'string', required: false, description: 'Alert description text.' },
    variant: { type: '"info" | "success" | "warning" | "destructive" | "default"', required: false, description: 'Visual variant with icon and color.' },
    hideIcon: { type: 'boolean', required: false, description: 'Hide the leading icon.' },
  },
  example: { type: 'alert', props: { title: 'System update', description: 'Your application will restart in 5 minutes.', variant: 'info' } },
};
