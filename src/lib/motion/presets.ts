// src/lib/motion/presets.ts
// @file motion/presets.ts
// @description Semantic-preset → physics map and easing-keyword → M3
//   cubic-bezier map. The LLM picks intent (snappy/smooth/…); these tables
//   carry the numbers. Pure data + lookups — no DOM, no window. SSR-safe.
//   The Fluid-Functionalism-tuned spring token table is wired in Phase 2.
// @created 2026-05-30 — RFC 12 animation primitive.

import type { Transition } from '../schema/motion.js';

export type ResolvedPhysics =
  | { type: 'tween'; duration: number; easing: NonNullable<Transition['easing']> }
  | { type: 'spring'; stiffness: number; damping: number; bounce: number };

const PRESETS: Record<NonNullable<Transition['preset']>, ResolvedPhysics> = {
  instant: { type: 'tween', duration: 100, easing: 'standard' },
  snappy: { type: 'spring', stiffness: 400, damping: 30, bounce: 0.1 },
  smooth: { type: 'tween', duration: 250, easing: 'decelerate' },
  gentle: { type: 'tween', duration: 400, easing: 'standard' },
  bouncy: { type: 'spring', stiffness: 300, damping: 18, bounce: 0.4 },
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
