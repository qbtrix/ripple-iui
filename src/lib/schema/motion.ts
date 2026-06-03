// @file schema/motion.ts
// @description The `motion` primitive — a node-level animation field on every
//   UINode (sibling to class/style, NOT inside props). A closed, GPU-safe
//   channel enum keeps layout-thrashing props (width/top/margin) unrepresentable.
//   Semantic presets carry the physics so the LLM picks intent, not numbers.
// @created 2026-05-30 — RFC 12 (Paw Sites) animation primitive.
// @changes
//   - 2026-05-30 (Task 1.13 close-out): export `MotionInput` (z.input) — the
//     AUTHOR-facing shape where defaulted fields (reduceMotion, inView.once/
//     amount, stagger from/direction, scroll.range) are optional. Spec literals
//     and the engine compiler type against this; parse RESULTS keep z.infer.
//   - 2026-05-30 (PR #45 motion runtime close-out): `transition.delay` UNIT is
//     SECONDS (Framer/motion.dev convention), NOT ms. e.g. `delay: 0.12` = 120ms.
//     A per-card cascade is `delay: i * 0.12`. The Tier-0 CSS runtime multiplies
//     by 1000 internally; the Tier-1 motion.dev path passes the seconds straight
//     through. `duration` stays ms (it maps to a preset's ms duration). The two
//     differ because `duration` is preset-derived (already ms) while `delay` is
//     author-authored and we match the ecosystem authors write against.

import { z } from 'zod';

const MotionState = z.object({ opacity: z.number().optional(), x: z.union([z.number(), z.string()]).optional(), y: z.union([z.number(), z.string()]).optional(), scale: z.number().optional(), rotate: z.number().optional(), blur: z.number().optional() }).partial();
// NOTE: `delay` is in SECONDS (Framer-style) — see @changes above. `duration` is ms.
const Transition = z.object({ type: z.enum(['spring','tween']).optional(), preset: z.enum(['instant','snappy','smooth','gentle','bouncy']).optional(), duration: z.number().optional(), easing: z.enum(['standard','emphasized','decelerate','accelerate','linear']).optional(), stiffness: z.number().optional(), damping: z.number().optional(), bounce: z.number().min(0).max(1).optional(), delay: z.number().optional() });
export const Motion = z.object({ enter: MotionState.optional(), exit: MotionState.optional(), hover: MotionState.optional(), tap: MotionState.optional(), focus: MotionState.optional(), inView: MotionState.extend({ once: z.boolean().default(true), amount: z.union([z.number(), z.literal('all')]).default(0.2), margin: z.string().optional() }).partial().optional(), scroll: z.object({ property: z.enum(['y','x','opacity','scale','rotate']), from: z.number(), to: z.number(), range: z.enum(['cover','contain','entry','exit']).default('cover') }).optional(), stagger: z.union([z.number(), z.object({ each: z.number(), from: z.enum(['first','last','center']).default('first'), direction: z.enum(['normal','reverse']).default('normal') })]).optional(), layout: z.string().optional(), transition: Transition.optional(), reduceMotion: z.enum(['off','cross-fade','none']).default('cross-fade') });

export type Motion = z.infer<typeof Motion>;
/** Author-facing INPUT shape (defaulted fields optional). Use for spec literals. */
export type MotionInput = z.input<typeof Motion>;
export type MotionState = z.infer<typeof MotionState>;
export type Transition = z.infer<typeof Transition>;
export { MotionState, Transition };
