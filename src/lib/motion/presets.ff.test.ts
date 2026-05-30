// src/lib/motion/presets.ff.test.ts
// @file motion/presets.ff.test.ts
// @description Asserts the Fluid-Functionalism-tuned spring token table and the
//   re-tuned preset durations (FF restraint: fast 0.08 / moderate 0.16 / slow 0.24).
// @created 2026-05-30 — RFC 12 premium pack, Phase 2 Task 2.1.

import { describe, expect, it } from 'vitest';
import { FF_SPRING_TOKENS, resolvePreset } from './presets.js';

describe('Fluid Functionalism spring tokens', () => {
  it('exposes fast / moderate / slow tokens tuned to FF restraint', () => {
    expect(FF_SPRING_TOKENS.fast).toEqual({ duration: 0.08, bounce: 0 });
    expect(FF_SPRING_TOKENS.moderate).toEqual({ duration: 0.16, bounce: 0.15 });
    expect(FF_SPRING_TOKENS.slow).toEqual({ duration: 0.24, bounce: 0.15 });
  });

  it('instant maps to the FF fast token (no bounce, ~80ms)', () => {
    const p = resolvePreset('instant');
    // instant stays a tween for CSS, but its duration tracks FF fast (80ms).
    expect(p).toMatchObject({ type: 'tween', duration: 80 });
  });

  it('smooth tracks the FF moderate token duration (160ms)', () => {
    expect(resolvePreset('smooth')).toMatchObject({ type: 'tween', duration: 160 });
  });

  it('gentle tracks the FF slow token duration (240ms)', () => {
    expect(resolvePreset('gentle')).toMatchObject({ type: 'tween', duration: 240 });
  });

  it('snappy carries a near-zero-bounce spring (FF restraint)', () => {
    const p = resolvePreset('snappy');
    expect(p.type).toBe('spring');
    if (p.type === 'spring') expect(p.bounce).toBeLessThanOrEqual(0.15);
  });
});
