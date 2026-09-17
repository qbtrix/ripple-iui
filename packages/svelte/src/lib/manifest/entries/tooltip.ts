import type { WidgetManifestEntry } from '../index.js';

export const tooltipEntry: WidgetManifestEntry = {
  type: 'tooltip',
  category: 'overlay',
  description: 'Text-only tooltip on hover. Use popover for richer content.',
  props: {
    trigger: { type: 'string | UISpec', required: false, description: 'Trigger text or spec node.' },
    content: { type: 'string', required: false, description: 'Tooltip body text.' },
    side: { type: '"top" | "right" | "bottom" | "left"', required: false, description: 'Position relative to trigger.' },
    align: { type: '"start" | "center" | "end"', required: false, description: 'Alignment.' },
    delay: { type: 'number', required: false, description: 'Show delay in ms. Default 200.' },
  },
  example: { type: 'tooltip', props: { trigger: 'Hover me', content: 'Helpful context here.', side: 'top' } },
};
