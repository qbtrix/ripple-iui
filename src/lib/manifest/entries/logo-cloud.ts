// @file manifest/entries/logo-cloud.ts — manifest entry for the `logo-cloud` widget.
// @created 2026-05-30 — RFC 12 marketing widget pack.
import type { WidgetManifestEntry } from '../index.js';

export const logoCloudEntry: WidgetManifestEntry = {
  type: 'logo-cloud',
  category: 'display',
  description: 'Row of client / partner logos with an optional heading. Grayscale by default, color on hover. Aliased as logos. Use for social proof.',
  props: {
    heading: { type: 'string', required: false, description: 'Optional eyebrow heading, e.g. "Trusted by".' },
    logos: { type: 'Array<{ src: string; alt: string; href?: string }>', required: false, description: 'Logo images.' },
  },
  example: {
    type: 'logo-cloud',
    props: {
      heading: 'Trusted by clinics across the city',
      logos: [
        { src: '/logos/acme.svg', alt: 'Acme' },
        { src: '/logos/globex.svg', alt: 'Globex' },
        { src: '/logos/initech.svg', alt: 'Initech' },
      ],
    },
  },
};
