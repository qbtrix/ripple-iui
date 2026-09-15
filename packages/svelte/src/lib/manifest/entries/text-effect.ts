// @file manifest/entries/text-effect.ts — manifest entry for the `text-effect` widget.
// @created 2026-05-30 — RFC 12 premium pack (svelte-animations, MIT).
import type { WidgetManifestEntry } from '../index.js';

export const textEffectEntry: WidgetManifestEntry = {
  type: 'text-effect',
  category: 'display',
  description: 'Reveals text per word or character with a staggered animation (pure CSS). Aliased animated-text. Use for hero headlines and eyebrow text.',
  props: {
    text: { type: 'string', required: true, description: 'The text to animate.' },
    effect: { type: "'gradient' | 'fade-in' | 'shimmer'", required: false, description: 'Reveal effect. Default fade-in.' },
    by: { type: "'word' | 'char'", required: false, description: 'Split granularity. Default word.' },
    stagger: { type: 'number', required: false, description: 'Seconds between each unit. Default 0.05.' },
  },
  example: {
    type: 'text-effect',
    props: { text: 'Build. Brand. Ship.', effect: 'gradient', by: 'word' },
    class: 'text-4xl font-bold',
  },
};
