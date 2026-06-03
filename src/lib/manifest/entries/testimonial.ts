// @file manifest/entries/testimonial.ts — manifest entry for the `testimonial` widget.
// @created 2026-05-30 — RFC 12 marketing widget pack.
import type { WidgetManifestEntry } from '../index.js';

export const testimonialEntry: WidgetManifestEntry = {
  type: 'testimonial',
  category: 'marketing',
  description: 'A single customer testimonial card: quote, author, role, optional avatar. Use for social proof on a landing page.',
  props: {
    quote: { type: 'string', required: true, description: 'The testimonial text.' },
    author: { type: 'string', required: false, description: 'Person quoted.' },
    role: { type: 'string', required: false, description: 'Their role / company.' },
    avatar: { type: 'string', required: false, description: 'Avatar image URL.' },
  },
  example: {
    type: 'testimonial',
    props: { quote: 'Booking went from a phone-tag headache to one tap.', author: 'Dr. Lee', role: 'Owner, Bright Smile Dental' },
  },
};
