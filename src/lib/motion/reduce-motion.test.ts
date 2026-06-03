// src/lib/motion/reduce-motion.test.ts
// @file motion/reduce-motion.test.ts
// @description Tests for the runtime reduce-motion rewrite: cross-fade rewrites
//   every state to opacity-only and drops movement-based directives; none strips
//   all animation; off passes through unchanged.
// @created 2026-05-30 — RFC 12 animation primitive (Task 1.4).

import { describe, expect, it } from 'vitest';
import { rewriteForReducedMotion } from './reduce-motion.js';
import type { Motion } from '../schema/motion.js';

describe('rewriteForReducedMotion', () => {
  it('cross-fade: replaces every state with opacity-only', () => {
    const m: Motion = { enter: { opacity: 0, y: 40, scale: 0.9 }, hover: { scale: 1.1 }, reduceMotion: 'cross-fade' };
    const out = rewriteForReducedMotion(m);
    expect(out.enter).toEqual({ opacity: 0 });
    expect(out.hover).toEqual({ opacity: 1 });
  });

  it('cross-fade: drops scroll + stagger (movement-based)', () => {
    const m: Motion = { scroll: { property: 'y', from: 0, to: 100, range: 'cover' }, stagger: 0.05, reduceMotion: 'cross-fade' };
    const out = rewriteForReducedMotion(m);
    expect(out.scroll).toBeUndefined();
    expect(out.stagger).toBeUndefined();
  });

  it('none: returns no animation at all (resting only)', () => {
    const m: Motion = { enter: { opacity: 0, y: 40 }, reduceMotion: 'none' };
    const out = rewriteForReducedMotion(m);
    expect(out.enter).toBeUndefined();
    expect(out.hover).toBeUndefined();
  });

  it('off: returns the motion unchanged', () => {
    const m: Motion = { enter: { opacity: 0, y: 40 }, reduceMotion: 'off' };
    expect(rewriteForReducedMotion(m)).toEqual(m);
  });

  it('cross-fade enter with no opacity defaults the from to 0', () => {
    const m: Motion = { enter: { y: 40 }, reduceMotion: 'cross-fade' };
    expect(rewriteForReducedMotion(m).enter).toEqual({ opacity: 0 });
  });
});
