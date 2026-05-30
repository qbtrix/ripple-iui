// src/lib/manifest/motion-doc.ts
// @file manifest/motion-doc.ts
// @description The LLM-facing documentation for the node-level `motion` field:
//   the vocabulary, the semantic presets, the "motion budget" taste rule, and
//   named recipes the generator can lift. Shipped inside the manifest so the
//   field is documented alongside the widget catalog.
// @created 2026-05-30 — RFC 12 animation primitive.
// @changes
//   - 2026-05-30 (Task 3.5): reveal-section recipe inner node swapped from
//     grid/card back to the now-shipped `feature-grid` marketing widget.
//   - 2026-05-30 (Task 1.13 close-out): doc `examples[].motion` is typed
//     MotionInput (author shape) instead of the post-parse Motion, so the
//     reduceMotion-less literals below type-check without a redundant default;
//     dropped the now-unneeded `as Motion['inView']` cast on section-reveal.

import type { MotionInput } from '../schema/motion.js';
import type { WidgetManifestEntry } from './index.js';

export interface MotionDoc {
  field: 'motion';
  description: string;
  /** The taste guardrail — the single most important rule for the LLM. */
  budgetRule: string;
  presets: Record<string, string>;
  examples: Array<{ name: string; description: string; motion: MotionInput }>;
  recipes: Array<{ name: string; description: string; ui: WidgetManifestEntry['example'] }>;
}

export const motionDoc: MotionDoc = {
  field: 'motion',
  description:
    'Add a `motion` field to ANY node (sibling to props/class/style, never inside props) to animate it. ' +
    'Vocabulary: enter/exit, hover/tap/focus, inView (reveal on scroll), scroll (parallax), stagger, ' +
    'and transition (use a semantic preset — never raw numbers). MotionState channels are GPU-safe only ' +
    '(opacity, x, y, scale, rotate, blur). Reduced-motion and SSR are handled by the runtime — do not add them.',
  budgetRule:
    'MOTION BUDGET: animate entrances and the PRIMARY call-to-action only. Leave everything else at rest. ' +
    'Default transition is `snappy`. Over-animating reads as cheap — restraint reads as premium.',
  presets: {
    instant: 'tween 100ms — micro-feedback.',
    snappy: 'spring, lively but controlled — the default for entrances and CTAs.',
    smooth: 'tween 250ms decelerate — section reveals.',
    gentle: 'tween 400ms — large hero elements.',
    bouncy: 'spring with overshoot — playful accents, use rarely.',
  },
  examples: [
    { name: 'hero-entrance', description: 'Fade + rise on load.', motion: { enter: { opacity: 0, y: 24 }, transition: { preset: 'snappy' } } },
    { name: 'cta-hover', description: 'Lift the primary button on hover.', motion: { hover: { y: -2, scale: 1.02 }, transition: { preset: 'snappy' } } },
    { name: 'section-reveal', description: 'Reveal a section as it scrolls into view.', motion: { inView: { opacity: 0, y: 32, once: true }, transition: { preset: 'smooth' } } },
  ],
  recipes: [
    {
      name: 'reveal-section',
      description: 'A section whose heading and cards rise into view on scroll. The canonical landing-page reveal.',
      ui: {
        type: 'reveal',
        props: { direction: 'up' },
        children: [
          { type: 'section', props: { title: 'How it works', description: 'Three steps.' }, children: [
            { type: 'feature-grid', props: { columns: 3, features: [
              { title: 'Build', description: 'Describe it in chat.' },
              { title: 'Publish', description: 'One click to the edge.' },
              { title: 'Edit forever', description: 'Keep changing it by chat.' },
            ] } },
          ] },
        ],
      },
    },
  ],
};
