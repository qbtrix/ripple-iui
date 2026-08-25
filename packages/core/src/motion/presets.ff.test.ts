// src/lib/motion/presets.ff.test.ts
// @file motion/presets.ff.test.ts
// @description Asserts the Fluid-Functionalism-tuned spring token table and the
//   re-tuned preset durations (FF restraint: fast 0.08 / moderate 0.16 / slow 0.24).
// @created 2026-05-30 — RFC 12 premium pack, Phase 2 Task 2.1.
// @changes
//   - 2026-05-30 (PR #45 checkbox-group port): added coverage for
//     `ffTokenToCssTiming`, which honors the FF token's authored duration
//     (80/160/240ms) instead of the 220ms entrance floor — the signature
//     sub-100ms hover glide depends on this.

import { describe, expect, it } from 'vitest';
import { FF_SPRING_TOKENS, resolvePreset, ffTokenToCssTiming } from './presets.js';

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

describe('ffTokenToCssTiming', () => {
  it('honors the FF token duration (80ms for fast) — no 220ms entrance floor', () => {
    // This is the whole point: the hover glide is 80ms, the sub-100ms snap that
    // reads "Apple-level". springToCssTiming would clamp this to 220ms.
    expect(ffTokenToCssTiming(FF_SPRING_TOKENS.fast).durationMs).toBe(80);
    expect(ffTokenToCssTiming(FF_SPRING_TOKENS.moderate).durationMs).toBe(160);
    expect(ffTokenToCssTiming(FF_SPRING_TOKENS.slow).durationMs).toBe(240);
  });

  it('zero-bounce token (fast) maps to the clean M3 decelerate curve', () => {
    expect(ffTokenToCssTiming(FF_SPRING_TOKENS.fast).easing).toBe(
      'cubic-bezier(0.05, 0.7, 0.1, 1)'
    );
  });

  it('a bounce>0 token maps to a back-style overshoot cubic-bezier', () => {
    const { easing } = ffTokenToCssTiming(FF_SPRING_TOKENS.moderate);
    // bounce 0.15 → control-point y = 1.3 + 0.15*0.9 = 1.435 (overshoots past 1).
    expect(easing).toBe('cubic-bezier(0.34, 1.435, 0.4, 1)');
  });
});
