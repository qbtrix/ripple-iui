// @file manifest/entries/marketing-hero.ts — manifest entry for the `marketing-hero` widget.
// @created 2026-06-09 — ITEM 4: bespoke marketing hero. category 'marketing',
//   staticSafe (resting state baked into markup; only motion is a CSS glow drift
//   that degrades under prefers-reduced-motion / JS-off).
import type { WidgetManifestEntry } from '../index.js';

export const marketingHeroEntry: WidgetManifestEntry = {
  type: 'marketing-hero',
  category: 'marketing',
  staticSafe: true,
  description: 'Bespoke landing hero: eyebrow pill, large headline, subtitle, primary + optional secondary CTA, and an asymmetric CSS visual panel. Use as the page opener.',
  props: {
    eyebrow: { type: 'string', required: false, description: 'Small label above the headline (rendered as a pill).' },
    title: { type: 'string', required: true, description: 'The headline.' },
    subtitle: { type: 'string', required: false, description: 'Supporting line under the headline.' },
    cta: { type: 'string', required: false, description: 'Primary CTA label.' },
    ctaHref: { type: 'string', required: false, description: 'Primary CTA destination.' },
    secondaryCta: { type: 'string', required: false, description: 'Optional secondary (ghost) CTA label.' },
    secondaryCtaHref: { type: 'string', required: false, description: 'Secondary CTA destination.' },
    visual: { type: "'grid' | 'glow' | 'plain'", required: false, description: "Right-panel treatment: 'grid' (dots + glow + spec chip, default), 'glow' (glow only), 'plain' (no panel, centered copy)." },
    align: { type: "'left' | 'center'", required: false, description: "Copy alignment. Default 'left'. Forced center when visual='plain'." },
  },
  example: {
    type: 'marketing-hero',
    props: {
      eyebrow: 'Bright Smile Dental',
      title: 'A dentist your whole family looks forward to',
      subtitle: 'Gentle care, transparent pricing, and same-week appointments — book in under a minute.',
      cta: 'Book an appointment',
      ctaHref: '#book',
      secondaryCta: 'See our services',
      secondaryCtaHref: '#services',
      visual: 'grid',
    },
  },
};
