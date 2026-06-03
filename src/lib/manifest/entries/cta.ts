// @file manifest/entries/cta.ts — manifest entry for the `cta` widget.
// @created 2026-05-30 — RFC 12 marketing widget pack.
import type { WidgetManifestEntry } from '../index.js';

export const ctaEntry: WidgetManifestEntry = {
  type: 'cta',
  category: 'marketing',
  description: 'Call-to-action band: a headline, optional subtext, and one button. Aliased as call-to-action. Use to drive the page conversion.',
  props: {
    headline: { type: 'string', required: true, description: 'The primary line.' },
    subtext: { type: 'string', required: false, description: 'Supporting copy.' },
    button: { type: 'string', required: false, description: 'Button label.' },
    href: { type: 'string', required: false, description: 'Button destination.' },
    align: { type: '"left" | "center"', required: false, description: 'Content alignment. Default "center".' },
  },
  example: {
    type: 'cta',
    props: { headline: 'Ready for a brighter smile?', subtext: 'Book your first visit in under a minute.', button: 'Book now', href: '#book', align: 'center' },
  },
};
