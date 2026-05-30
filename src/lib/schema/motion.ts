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

import { z } from 'zod';

const MotionState = z.object({ opacity: z.number().optional(), x: z.union([z.number(), z.string()]).optional(), y: z.union([z.number(), z.string()]).optional(), scale: z.number().optional(), rotate: z.number().optional(), blur: z.number().optional() }).partial();
const Transition = z.object({ type: z.enum(['spring','tween']).optional(), preset: z.enum(['instant','snappy','smooth','gentle','bouncy']).optional(), duration: z.number().optional(), easing: z.enum(['standard','emphasized','decelerate','accelerate','linear']).optional(), stiffness: z.number().optional(), damping: z.number().optional(), bounce: z.number().min(0).max(1).optional(), delay: z.number().optional() });
export const Motion = z.object({ enter: MotionState.optional(), exit: MotionState.optional(), hover: MotionState.optional(), tap: MotionState.optional(), focus: MotionState.optional(), inView: MotionState.extend({ once: z.boolean().default(true), amount: z.union([z.number(), z.literal('all')]).default(0.2), margin: z.string().optional() }).partial().optional(), scroll: z.object({ property: z.enum(['y','x','opacity','scale','rotate']), from: z.number(), to: z.number(), range: z.enum(['cover','contain','entry','exit']).default('cover') }).optional(), stagger: z.union([z.number(), z.object({ each: z.number(), from: z.enum(['first','last','center']).default('first'), direction: z.enum(['normal','reverse']).default('normal') })]).optional(), layout: z.string().optional(), transition: Transition.optional(), reduceMotion: z.enum(['off','cross-fade','none']).default('cross-fade') });

export type Motion = z.infer<typeof Motion>;
/** Author-facing INPUT shape (defaulted fields optional). Use for spec literals. */
export type MotionInput = z.input<typeof Motion>;
export type MotionState = z.infer<typeof MotionState>;
export type Transition = z.infer<typeof Transition>;
export { MotionState, Transition };
