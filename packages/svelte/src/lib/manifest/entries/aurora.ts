// @file manifest/entries/aurora.ts — manifest entry for the `aurora` widget.
// @created 2026-05-30 — RFC 12 premium pack (aceternity.sveltekit.io, MIT).
import type { WidgetManifestEntry } from '../index.js';

export const auroraEntry: WidgetManifestEntry = {
  type: 'aurora',
  category: 'layout',
  description: 'Wraps children over a soft, drifting multi-gradient aurora backdrop (pure CSS). Aliased aurora-background. Use as a hero or section background.',
  props: {
    colors: { type: 'string[]', required: false, description: 'Gradient stop colours driving the aurora. Default blue/violet/teal.' },
    speed: { type: 'number', required: false, description: 'Seconds per drift cycle (lower = faster). Default 12.' },
  },
  example: {
    type: 'aurora',
    class: 'min-h-[320px] flex items-center justify-center p-12',
    children: [{ type: 'heading', props: { text: 'Sites that move' } }],
  },
};
