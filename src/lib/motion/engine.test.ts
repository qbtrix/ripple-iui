// src/lib/motion/engine.test.ts
// @file motion/engine.test.ts
// @description Tests for compileMotion: tier selection (tween vs spring/stagger)
//   and the resting (SSR final) frame + initial (pre-animation) frame strings.
// @created 2026-05-30 — RFC 12 animation primitive (Task 1.5).

import { describe, expect, it } from 'vitest';
import { compileMotion } from './engine.js';
import type { Motion } from '../schema/motion.js';

describe('compileMotion — tier selection', () => {
  it('tween enter compiles to tier 0', () => {
    const plan = compileMotion({ enter: { opacity: 0, y: 20 }, transition: { preset: 'smooth' } });
    expect(plan.tier).toBe(0);
  });
  it('spring enter compiles to tier 1', () => {
    const plan = compileMotion({ enter: { opacity: 0, y: 20 }, transition: { preset: 'snappy' } });
    expect(plan.tier).toBe(1);
  });
  it('stagger forces tier 1', () => {
    const plan = compileMotion({ enter: { opacity: 0 }, stagger: 0.05 });
    expect(plan.tier).toBe(1);
  });
  it('explicit spring type forces tier 1', () => {
    const plan = compileMotion({ enter: { y: 10 }, transition: { type: 'spring', stiffness: 200, damping: 20 } });
    expect(plan.tier).toBe(1);
  });
});

describe('compileMotion — resting frame (SSR final frame)', () => {
  it('enter resting frame is the natural state (opacity 1, no transform)', () => {
    const plan = compileMotion({ enter: { opacity: 0, y: 40 } });
    // No transform offset and full opacity in the resting style.
    expect(plan.restingStyle).not.toMatch(/translate/);
    expect(plan.restingStyle).not.toMatch(/opacity:\s*0(\D|$)/);
  });
  it('initialStyle reflects the enter "from" frame (the pre-animation state)', () => {
    const plan = compileMotion({ enter: { opacity: 0, y: 40 } });
    expect(plan.initialStyle).toMatch(/opacity:\s*0/);
    expect(plan.initialStyle).toMatch(/translateY\(40px\)/);
  });
  it('string offsets pass through with their unit', () => {
    const plan = compileMotion({ enter: { x: '2rem' } });
    expect(plan.initialStyle).toMatch(/translateX\(2rem\)/);
  });
  it('numeric offsets get px', () => {
    const plan = compileMotion({ enter: { x: 12 } });
    expect(plan.initialStyle).toMatch(/translateX\(12px\)/);
  });
  it('a motion with no enter has an empty initialStyle', () => {
    const plan = compileMotion({ hover: { scale: 1.05 } });
    expect(plan.initialStyle).toBe('');
  });
});
