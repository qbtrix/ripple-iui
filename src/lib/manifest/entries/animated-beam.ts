// @file manifest/entries/animated-beam.ts — manifest entry for `animated-beam`.
// @created 2026-05-30 — RFC 12 premium pack (aceternity.sveltekit.io, MIT).
import type { WidgetManifestEntry } from '../index.js';

export const animatedBeamEntry: WidgetManifestEntry = {
  type: 'animated-beam',
  category: 'display',
  staticSafe: true,
  description: 'An SVG curve with a flowing gradient pulse connecting two points (pure SVG/CSS). Use to suggest a connection or data flow in a diagram.',
  props: {
    duration: { type: 'number', required: false, description: 'Seconds per flow. Default 4.' },
    curvature: { type: 'number', required: false, description: 'Arc height in viewBox units (negative bows up). Default -40.' },
    gradientStart: { type: 'string', required: false, description: 'Gradient start colour. Default #18CCFC.' },
    gradientStop: { type: 'string', required: false, description: 'Gradient stop colour. Default #AE48FF.' },
  },
  example: {
    type: 'animated-beam',
    props: { duration: 4, curvature: -50 },
    class: 'h-24 text-muted-foreground',
  },
};
