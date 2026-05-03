import type { WidgetManifestEntry } from '../index.js';

export const popoverEntry: WidgetManifestEntry = {
  type: 'popover',
  category: 'overlay',
  description: 'Click-to-open popover with rich content. Supports spec nodes for body. Bind `open` for two-way control.',
  props: {
    trigger: { type: 'string | UISpec', required: false, description: 'Trigger text or spec node.' },
    content: { type: 'string | UISpec', required: false, description: 'Body text or spec node.' },
    side: { type: '"top" | "right" | "bottom" | "left"', required: false, description: 'Position. Default "bottom".' },
    align: { type: '"start" | "center" | "end"', required: false, description: 'Alignment.' },
    open: { type: 'boolean', required: false, description: 'Open state (use with bind).' },
  },
  example: { type: 'popover', props: { trigger: 'View details', content: 'Detailed explanation with extra context.', side: 'right', open: false } },
};
