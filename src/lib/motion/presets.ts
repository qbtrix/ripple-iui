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
