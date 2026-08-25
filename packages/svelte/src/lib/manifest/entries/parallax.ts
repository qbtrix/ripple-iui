// @file manifest/entries/parallax.ts — manifest entry for the `parallax` sugar widget.
// @created 2026-05-30 — RFC 12 animation primitive, Task 1.12.
import type { WidgetManifestEntry } from '../index.js';

export const parallaxEntry: WidgetManifestEntry = {
  type: 'parallax',
  category: 'layout',
  description: 'Container whose contents drift vertically as the page scrolls. Sugar over a scroll motion. Use sparingly for depth on hero imagery.',
  props: {
    distance: { type: 'number', required: false, description: 'Vertical drift in px across the scroll range. Default 60.' },
  },
  example: {
    type: 'parallax',
    props: { distance: 60 },
    children: [{ type: 'image', props: { src: '/hero.jpg', alt: 'Backdrop' } }],
  },
};
