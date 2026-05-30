// src/lib/motion/presets.ts
// @file motion/presets.ts
// @description Semantic-preset → physics map and easing-keyword → M3
//   cubic-bezier map. The LLM picks intent (snappy/smooth/…); these tables
//   carry the numbers. Pure data + lookups — no DOM, no window. SSR-safe.
// @provenance Spring tuning ported from Fluid Functionalism
//   (github.com/mickadesign/fluid-functionalism, MIT) — systems only, no
//   component code.
// @created 2026-05-30 — RFC 12 animation primitive.
// @changes
//   - Phase 2 (Task 2.1): tuned the preset durations to the FF spring tokens
//     (instant/smooth/gentle: 100/250/400 → 80/160/240) and added the
//     FF_SPRING_TOKENS table so the whole pack reads premium-restrained.
//   - 2026-05-30 (PR #45 motion degrade-to-visible fix): added
//     `springToCssTiming` — approximates a resolved SPRING as a CSS
//     duration + spring-like cubic-bezier so the Tier-0 (CSS transition) enter
//     path can render a spring-preset entrance WITHOUT requiring motion.dev.
//     motion.dev could not spring-interpolate the `transform:'none'` target
//     (it collapsed the box to a zero matrix), so the reliable, can't-fail-to-
//     load CSS path is now the default for declarative entrances. Bounce maps
//     to a back-ease overshoot; zero-bounce maps to a clean decelerate.

import type { Transition } from '../schema/motion.js';

export type ResolvedPhysics =
  | { type: 'tween'; duration: number; easing: NonNullable<Transition['easing']> }
  | { type: 'spring'; stiffness: number; damping: number; bounce: number };

/**
 * Fluid Functionalism spring tokens (MIT — github.com/mickadesign/fluid-functionalism).
 * FF's restraint: short durations, near-zero bounce. The presets below are tuned
 * to these so the whole pack reads as premium-restrained, not bouncy.
 */
export const FF_SPRING_TOKENS = {
  fast: { duration: 0.08, bounce: 0 },
  moderate: { duration: 0.16, bounce: 0.15 },
  slow: { duration: 0.24, bounce: 0.15 },
} as const;

const PRESETS: Record<NonNullable<Transition['preset']>, ResolvedPhysics> = {
  instant: { type: 'tween', duration: 80, easing: 'standard' },           // FF fast
  snappy: { type: 'spring', stiffness: 400, damping: 30, bounce: 0.1 },   // lively, FF-restrained
  smooth: { type: 'tween', duration: 160, easing: 'decelerate' },         // FF moderate
  gentle: { type: 'tween', duration: 240, easing: 'standard' },           // FF slow
  bouncy: { type: 'spring', stiffness: 300, damping: 18, bounce: 0.4 },   // the one playful preset
};

export function resolvePreset(preset: NonNullable<Transition['preset']>): ResolvedPhysics {
  return PRESETS[preset];
}

/** Easing keyword → Material 3 cubic-bezier. emphasized aliases decelerate. */
export const EASING_CUBIC_BEZIER: Record<NonNullable<Transition['easing']>, string> = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  emphasized: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  decelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  accelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
  linear: 'linear',
};

export function resolveEasing(easing: Transition['easing'] | undefined): string {
  return EASING_CUBIC_BEZIER[easing ?? 'standard'];
}

/**
 * Approximate a resolved SPRING as a CSS `transition` duration + easing.
 *
 * Why this exists: a declarative entrance (fade / rise / scale to rest) does not
 * need real spring physics — CSS handles it reliably and the engine can never
 * "fail to load." The Tier-1 motion.dev spring path was actively HARMFUL for
 * entrances: it could not interpolate the `transform: 'none'` keyword target and
 * collapsed the element to `matrix(0,0,0,0,0,0)` (an invisible, zero-size box).
 * So the default enter path now runs on CSS and uses this to read spring-like.
 *
 * - duration: a perceptual settle time derived from stiffness/damping (stiffer →
 *   shorter, heavier damping → shorter), clamped to a tasteful 220–520ms window.
 * - easing: bounce>0 → a slight `back`-style overshoot cubic-bezier (the y>1
 *   second control point produces the spring "kiss past then settle"); bounce≈0 →
 *   the M3 decelerate curve (clean, no overshoot), matching the FF restraint.
 */
export function springToCssTiming(
  spring: { stiffness?: number; damping?: number; bounce?: number },
): { durationMs: number; easing: string } {
  const stiffness = spring.stiffness ?? 300;
  const damping = spring.damping ?? 24;
  const bounce = spring.bounce ?? 0;

  // Heuristic perceptual duration: higher stiffness settles faster, higher
  // damping settles faster. ~2*sqrt(1/stiffness) scaled, biased by damping.
  const raw = 1000 * (2 * Math.sqrt(1 / stiffness)) * (1 + 8 / Math.max(damping, 1));
  const durationMs = Math.round(Math.min(520, Math.max(220, raw)));

  // bounce → overshoot. Map bounce [0..1] to a control-point overshoot so a
  // small bounce reads lively and a large one (bouncy preset, 0.4) reads playful,
  // WITHOUT ever producing a degenerate transform — CSS interpolates cleanly.
  const easing =
    bounce > 0
      ? `cubic-bezier(0.34, ${(1.3 + bounce * 0.9).toFixed(3)}, 0.4, 1)`
      : EASING_CUBIC_BEZIER.decelerate;

  return { durationMs, easing };
}
