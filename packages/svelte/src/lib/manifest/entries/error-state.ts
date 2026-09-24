import type { WidgetManifestEntry } from '../index.js';

export const errorStateEntry: WidgetManifestEntry = {
  type: 'error-state',
  category: 'overlay',
  description: 'Error state with icon, title, description, optional code/detail, and primary/secondary actions.',
  props: {
    title: { type: 'string', required: false, description: 'Error title.' },
    description: { type: 'string', required: false, description: 'Error description.' },
    icon: { type: 'string', required: false, description: 'Lucide icon slug.' },
    actionLabel: { type: 'string', required: false, description: 'Primary action label.' },
    secondaryLabel: { type: 'string', required: false, description: 'Secondary action label.' },
    detail: { type: 'string', required: false, description: 'Error code or technical detail (monospace).' },
  },
  example: {
    type: 'error-state',
    props: {
      title: 'Connection failed',
      description: "We couldn't reach the server. Please check your internet and try again.",
      icon: 'alert-circle',
      actionLabel: 'Retry',
      secondaryLabel: 'Go back',
      detail: 'Error: NETWORK_TIMEOUT',
    },
  },
};
