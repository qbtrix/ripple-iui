// @file manifest/entries/marquee.ts — manifest entry for the `marquee` widget.
// @created 2026-05-30 — RFC 12 premium pack (svelte-animations, MIT).
import type { WidgetManifestEntry } from '../index.js';

export const marqueeEntry: WidgetManifestEntry = {
  type: 'marquee',
  category: 'display',
  staticSafe: true,
  description: 'Seamless scrolling row/column of its children (logos, badges, quotes). Pure-CSS loop, pauses on hover. Use for logo strips and ticker rows.',
  props: {
    duration: { type: 'number', required: false, description: 'Seconds per loop. Default 30.' },
    pauseOnHover: { type: 'boolean', required: false, description: 'Pause the scroll on hover. Default true.' },
    reverse: { type: 'boolean', required: false, description: 'Reverse the scroll direction. Default false.' },
    direction: { type: "'horizontal' | 'vertical'", required: false, description: 'Scroll axis. Default horizontal.' },
  },
  example: {
    type: 'marquee',
    props: { duration: 24, pauseOnHover: true },
    children: [
      { type: 'image', props: { src: '/logos/acme.svg', alt: 'Acme' } },
      { type: 'image', props: { src: '/logos/globex.svg', alt: 'Globex' } },
      { type: 'image', props: { src: '/logos/initech.svg', alt: 'Initech' } },
    ],
  },
};
