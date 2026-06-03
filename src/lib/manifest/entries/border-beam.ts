// @file manifest/entries/border-beam.ts — manifest entry for `border-beam`.
// @created 2026-05-30 — RFC 12 premium pack (svelte-animations, MIT).
import type { WidgetManifestEntry } from '../index.js';

export const borderBeamEntry: WidgetManifestEntry = {
  type: 'border-beam',
  category: 'display',
  description: 'Wraps children in a card-like box with a gradient beam orbiting its border (pure CSS). Use to draw attention to a featured card or CTA.',
  props: {
    size: { type: 'number', required: false, description: 'Beam thickness in px. Default 1.5.' },
    duration: { type: 'number', required: false, description: 'Seconds per orbit. Default 8.' },
    colorFrom: { type: 'string', required: false, description: 'Gradient start colour. Default #ffaa40.' },
    colorTo: { type: 'string', required: false, description: 'Gradient end colour. Default #9c40ff.' },
  },
  example: {
    type: 'border-beam',
    class: 'rounded-xl border bg-card p-6',
    children: [{ type: 'text', props: { text: 'Featured plan' } }],
  },
};
