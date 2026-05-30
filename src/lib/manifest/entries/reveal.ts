// @file manifest/entries/reveal.ts — manifest entry for the `reveal` sugar widget.
// @created 2026-05-30 — RFC 12 animation primitive, Task 1.12.
import type { WidgetManifestEntry } from '../index.js';

export const revealEntry: WidgetManifestEntry = {
  type: 'reveal',
  category: 'layout',
  description: 'Container that animates its children into view on scroll. Sugar over an inView motion. Use to reveal sections as the visitor scrolls a landing page.',
  props: {
    direction: { type: '"up" | "down" | "left" | "right" | "fade"', required: false, description: 'Travel direction. Default "up".' },
    once: { type: 'boolean', required: false, description: 'Reveal only the first time it enters view. Default true.' },
  },
  example: {
    type: 'reveal',
    props: { direction: 'up' },
    children: [{ type: 'hero', props: { title: 'We build for the long tail', align: 'center' } }],
  },
};
