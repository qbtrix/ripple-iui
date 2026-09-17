// @file manifest/entries/shimmer.ts — manifest entry for the `shimmer` widget.
// @created 2026-05-30 — RFC 12 premium pack (svelte-animations, MIT).
import type { WidgetManifestEntry } from '../index.js';

export const shimmerEntry: WidgetManifestEntry = {
  type: 'shimmer',
  category: 'display',
  // 2026-09-16: both strings corrected after the beautiful-ui re-skin. `width`
  // stopped being a no-repeat band and became the ramp offset either side of
  // centre, and the root is inline-flex, so a stretching flex column widens it
  // past the text and the band never crosses the glyphs — a caller who does not
  // know that sees a static label and reports a bug.
  // Kept under the 200-char manifest limit that manifest.test.ts enforces.
  description: 'Sweeps a moving highlight through the text of its children (pure CSS). Use on a CTA label or skeleton text. In a flex column pass self-start, or it stretches and the sweep misses the text.',
  props: {
    duration: { type: 'number', required: false, description: 'Seconds per sweep. Default 2.' },
    width: { type: 'string', required: false, description: 'How far either side of centre the bright band ramps (CSS length). Default 100px.' },
  },
  example: {
    type: 'shimmer',
    class: 'text-lg font-semibold',
    children: [{ type: 'text', props: { text: 'Get early access' } }],
  },
};
