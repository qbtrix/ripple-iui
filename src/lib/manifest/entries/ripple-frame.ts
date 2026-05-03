import type { WidgetManifestEntry } from '../index.js';

export const rippleFrameEntry: WidgetManifestEntry = {
  type: 'ripple-frame',
  category: 'composite',
  description: 'Renders a Ripple spec inside another spec with isolated state. Use for nested demos or independent tiles.',
  props: {
    spec: { type: 'UISpec | UniversalSpec', required: true, description: 'Inner Ripple spec to render.' },
    state: { type: 'Record<string, unknown>', required: false, description: 'Optional state override for the inner instance.' },
  },
  example: {
    type: 'ripple-frame',
    props: {
      spec: {
        type: 'flex',
        props: { direction: 'column', gap: 2 },
        children: [
          { type: 'text', props: { content: 'Inner spec' } },
          { type: 'button', props: { label: 'Click me' } },
        ],
      },
    },
  },
};
