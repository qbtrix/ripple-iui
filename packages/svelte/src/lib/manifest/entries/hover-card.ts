import type { WidgetManifestEntry } from '../index.js';

export const hoverCardEntry: WidgetManifestEntry = {
  type: 'hover-card',
  category: 'overlay',
  description: 'Rich card revealed on hover. Auto-closes on mouse leave.',
  props: {
    trigger: { type: 'string | UISpec', required: false, description: 'Trigger text or spec node.' },
    content: { type: 'string | UISpec', required: false, description: 'Body text or spec node.' },
    side: { type: '"top" | "right" | "bottom" | "left"', required: false, description: 'Position.' },
    align: { type: '"start" | "center" | "end"', required: false, description: 'Alignment.' },
    openDelay: { type: 'number', required: false, description: 'Show delay in ms. Default 300.' },
    closeDelay: { type: 'number', required: false, description: 'Hide delay in ms. Default 150.' },
  },
  example: { type: 'hover-card', props: { trigger: '@alice', content: 'Alice Chen — Product Designer at Acme.', side: 'bottom' } },
};
