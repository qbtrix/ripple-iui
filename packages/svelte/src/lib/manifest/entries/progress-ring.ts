import type { WidgetManifestEntry } from '../index.js';

export const progressRingEntry: WidgetManifestEntry = {
  type: 'progress-ring',
  category: 'display',
  description: 'Circular progress indicator with centered label.',
  props: {
    value: { type: 'number', required: false, description: 'Current progress (0 to max).' },
    max: { type: 'number', required: false, description: 'Maximum value. Default 100.' },
    size: { type: 'number', required: false, description: 'Ring diameter in px. Default 64.' },
    thickness: { type: 'number', required: false, description: 'Stroke width in px. Default 6.' },
    color: { type: 'string', required: false, description: 'Foreground color.' },
    trackColor: { type: 'string', required: false, description: 'Background track color.' },
    label: { type: 'string', required: false, description: 'Center label. Default "{percent}%".' },
    hideLabel: { type: 'boolean', required: false, description: 'Hide center label.' },
  },
  example: { type: 'progress-ring', props: { value: 72, max: 100, size: 80, color: '#6366f1' } },
};
