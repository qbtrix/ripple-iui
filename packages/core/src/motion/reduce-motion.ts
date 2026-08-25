// src/lib/motion/reduce-motion.ts
// @file motion/reduce-motion.ts
// @description Runtime reduce-motion policy. When the user prefers reduced
//   motion, every motion state is rewritten to an opacity-only cross-fade
//   (or removed entirely). Movement-based directives (scroll/stagger/layout)
//   are dropped. This is the runtime's job, never the spec author's. Pure;
//   SSR-safe.
// @created 2026-05-30 — RFC 12 animation primitive.

import type { Motion } from '../schema/motion.js';

/** A transition-only state with one channel: opacity. */
function crossFadeState(state: Record<string, unknown> | undefined, restingOpacity: number): { opacity: number } {
  // If the author specified opacity in the source state, honor it as the
  // from/to; otherwise default the "from" states (enter/exit) to 0 and the
  // interaction states (hover/tap/focus) to 1 (the resting opacity).
  const declared = state && typeof state.opacity === 'number' ? (state.opacity as number) : restingOpacity;
  return { opacity: declared };
}

export function rewriteForReducedMotion(motion: Motion): Motion {
  if (motion.reduceMotion === 'off') return motion;
  if (motion.reduceMotion === 'none') {
    // Strip ALL animation — leave only the resting page. transition kept so a
    // consumer reading it does not crash, but no states remain.
    const { transition, reduceMotion } = motion;
    return { transition, reduceMotion };
  }
  // cross-fade
  const out: Motion = { reduceMotion: 'cross-fade', transition: motion.transition };
  if (motion.enter) out.enter = crossFadeState(motion.enter, 0);
  if (motion.exit) out.exit = crossFadeState(motion.exit, 0);
  if (motion.hover) out.hover = crossFadeState(motion.hover, 1);
  if (motion.tap) out.tap = crossFadeState(motion.tap, 1);
  if (motion.focus) out.focus = crossFadeState(motion.focus, 1);
  // scroll / stagger / layout are movement-based — dropped under reduce-motion.
  return out;
}
