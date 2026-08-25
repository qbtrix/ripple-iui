// @file manifest/entries/spotlight.ts — manifest entry for the `spotlight` widget.
// @created 2026-05-30 — RFC 12 premium pack (aceternity.sveltekit.io, MIT).
import type { WidgetManifestEntry } from '../index.js';

export const spotlightEntry: WidgetManifestEntry = {
  type: 'spotlight',
  category: 'layout',
  description: 'Wraps children with a radial highlight that follows the cursor on hover (CSS, client-only pointer wiring). Use on a hero or feature card.',
  props: {
    size: { type: 'string', required: false, description: 'Highlight diameter (CSS length). Default 300px.' },
    color: { type: 'string', required: false, description: 'Highlight colour. Default a translucent white.' },
  },
  example: {
    type: 'spotlight',
    class: 'rounded-xl border bg-card p-10',
    children: [{ type: 'heading', props: { text: 'Hover to light it up' } }],
  },
};
