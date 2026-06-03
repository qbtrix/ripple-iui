// src/lib/motion/engine.ts
// @file motion/engine.ts
// @description The spec->engine compiler. Pure: no DOM, no window — runs
//   identically on server and client (workerd-SSR-safe). Decides the cheapest
//   tier per directive and computes the resting (final) frame + the initial
//   (pre-animation) frame as inline-style strings.
//   Tier 0 = Svelte built-ins / CSS. Tier 1 = motion.dev vanilla core (lazy).
// @created 2026-05-30 — RFC 12 animation primitive.
// @changes
//   - 2026-05-30 (Task 1.13 close-out): compileMotion accepts MotionInput (the
//     author shape) instead of the post-parse Motion. The compiler is pure and
//     never reads `reduceMotion`, so author literals (reduceMotion-less) and the
//     action's already-parsed Motion both satisfy it. MotionPlan.motion follows.
//   - 2026-05-30 (PR #45 motion runtime close-out): export `stateToStyle` so the
//     withMotion action reuses the SAME initial-frame builder for the inView
//     from-state (FIX 1) instead of duplicating the opacity-only logic. The
//     inView from-state is now a full transform+opacity+filter frame, identical
//     to how the enter "from" frame is built.

import type { MotionInput, MotionState, Transition } from '../schema/motion.js';
import { resolvePreset } from './presets.js';

export interface MotionPlan {
  /** Highest tier any directive in this motion needs. 0 = built-ins, 1 = motion.dev. */
  tier: 0 | 1;
  /** The natural/final frame the element renders with on SSR (no FOUC). */
  restingStyle: string;
  /** The pre-animation frame (enter "from"), applied on mount before animating. */
  initialStyle: string;
  /** The validated motion (already reduce-rewritten by the caller if needed). */
  motion: MotionInput;
}

function offset(value: number | string | undefined): string | null {
  if (value === undefined) return null;
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * Build a transform+opacity+filter style string from a MotionState. Exported so
 * the withMotion action arms the inView from-state with the SAME builder used
 * for the enter "from" frame (FIX 1) — no duplicated opacity-only logic.
 */
export function stateToStyle(state: MotionState | undefined): string {
  if (!state) return '';
  const parts: string[] = [];
  const transforms: string[] = [];
  const x = offset(state.x); if (x) transforms.push(`translateX(${x})`);
  const y = offset(state.y); if (y) transforms.push(`translateY(${y})`);
  if (typeof state.scale === 'number') transforms.push(`scale(${state.scale})`);
  if (typeof state.rotate === 'number') transforms.push(`rotate(${state.rotate}deg)`);
  if (transforms.length) parts.push(`transform: ${transforms.join(' ')}`);
  if (typeof state.opacity === 'number') parts.push(`opacity: ${state.opacity}`);
  if (typeof state.blur === 'number') parts.push(`filter: blur(${state.blur}px)`);
  return parts.join('; ');
}

function isSpring(transition: Transition | undefined): boolean {
  if (!transition) return false;
  if (transition.type === 'spring') return true;
  if (transition.preset) return resolvePreset(transition.preset).type === 'spring';
  return false;
}

export function compileMotion(motion: MotionInput): MotionPlan {
  // Tier 1 triggers: spring physics, stagger, or a spring inView.
  const needsTier1 =
    isSpring(motion.transition) ||
    motion.stagger !== undefined;

  // Resting frame = natural state. We only ever push the element AWAY from
  // natural (enter starts offset, hover scales up), so resting is "no offset,
  // full opacity, no blur" unless the author pinned opacity in a resting-ish
  // way. Keep it simple and deterministic: empty transform, opacity 1.
  const restingStyle = '';

  // Initial frame = the enter "from" state. Applied on mount before animating
  // to resting. On SSR we render restingStyle (finished); on hydrate the
  // action swaps to initialStyle then animates back.
  const initialStyle = stateToStyle(motion.enter);

  return { tier: needsTier1 ? 1 : 0, restingStyle, initialStyle, motion };
}
