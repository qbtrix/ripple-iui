import type { WidgetManifestEntry } from '../index.js';

export const apiKeyEntry: WidgetManifestEntry = {
  type: 'api-key',
  category: 'vertical',
  description: 'Secret key display with mask/reveal toggle, copy button, and optional rotate action.',
  props: {
    label: { type: 'string', required: false, description: 'Field label.' },
    value: { type: 'string', required: false, description: 'Secret value to display.' },
    description: { type: 'string', required: false, description: 'Helper text under the label.' },
    hideReveal: { type: 'boolean', required: false, description: 'Hide reveal toggle.' },
    hideRotate: { type: 'boolean', required: false, description: 'Hide rotate button.' },
    revealLast: { type: 'number', required: false, description: 'Trailing chars visible when masked. Default 4.' },
  },
  example: { type: 'api-key', props: { label: 'Live API Key', description: 'Use in production.', value: 'sk_live_9x8y7z6a5b4c3d2e1f0g9h8i7j6k5l4', revealLast: 4 } },
};
