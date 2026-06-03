// @file manifest/entries/navbar.ts — manifest entry for the `navbar` widget.
// @created 2026-05-30 — RFC 12 marketing widget pack.
import type { WidgetManifestEntry } from '../index.js';

export const navbarEntry: WidgetManifestEntry = {
  type: 'navbar',
  category: 'marketing',
  description: 'Marketing top navigation: brand, links, and an optional CTA button. Sticky-capable. Use at the top of a landing page.',
  props: {
    brand: { type: 'string', required: false, description: 'Brand / site name.' },
    links: { type: 'Array<{ label: string; href: string }>', required: false, description: 'Nav links.' },
    cta: { type: 'string', required: false, description: 'CTA button label.' },
    ctaHref: { type: 'string', required: false, description: 'CTA destination.' },
    sticky: { type: 'boolean', required: false, description: 'Stick to the top on scroll. Default false.' },
  },
  example: {
    type: 'navbar',
    props: { brand: 'Bright Smile Dental', links: [{ label: 'Services', href: '#services' }, { label: 'About', href: '#about' }], cta: 'Book now', ctaHref: '#book', sticky: true },
  },
};
