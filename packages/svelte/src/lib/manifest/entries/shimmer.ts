// @file manifest/entries/shimmer.ts — manifest entry for the `shimmer` widget.
// @created 2026-05-30 — RFC 12 premium pack (svelte-animations, MIT).
import type { WidgetManifestEntry } from '../index.js';

export const shimmerEntry: WidgetManifestEntry = {
  type: 'shimmer',
  category: 'display',
  description: 'Sweeps a moving highlight band across its children (pure CSS). Use on a CTA label, a "new" badge, or skeleton text to draw the eye.',
  props: {
    duration: { type: 'number', required: false, description: 'Seconds per sweep. Default 2.' },
    width: { type: 'string', required: false, description: 'Highlight band width (CSS length). Default 100px.' },
  },
  example: {
    type: 'shimmer',
    class: 'text-lg font-semibold',
    children: [{ type: 'text', props: { text: 'Get early access' } }],
  },
};
