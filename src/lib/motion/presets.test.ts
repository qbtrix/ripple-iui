// src/lib/motion/presets.test.ts
// @file motion/presets.test.ts
// @description Tests for the semantic-preset -> physics map and the
//   easing-keyword -> Material 3 cubic-bezier map.
// @created 2026-05-30 — RFC 12 animation primitive (Task 1.3).
// @changes
//   - Phase 2 (Task 2.1): instant/smooth/gentle assertions re-tuned to the FF
//     spring-token durations (100/250/400 → 80/160/240).

import { describe, expect, it } from 'vitest';
import { resolvePreset, EASING_CUBIC_BEZIER, resolveEasing } from './presets.js';

describe('motion presets', () => {
  it('instant = tween 80ms standard (FF fast)', () => {
    expect(resolvePreset('instant')).toEqual({ type: 'tween', duration: 80, easing: 'standard' });
  });
  it('snappy = spring stiffness 400 damping 30 bounce 0.1', () => {
    expect(resolvePreset('snappy')).toEqual({ type: 'spring', stiffness: 400, damping: 30, bounce: 0.1 });
  });
  it('smooth = tween 160ms decelerate (FF moderate)', () => {
    expect(resolvePreset('smooth')).toEqual({ type: 'tween', duration: 160, easing: 'decelerate' });
  });
  it('gentle = tween 240ms standard (FF slow)', () => {
    expect(resolvePreset('gentle')).toEqual({ type: 'tween', duration: 240, easing: 'standard' });
  });
  it('bouncy = spring stiffness 300 damping 18 bounce 0.4', () => {
    expect(resolvePreset('bouncy')).toEqual({ type: 'spring', stiffness: 300, damping: 18, bounce: 0.4 });
  });
});

describe('easing → M3 cubic-bezier', () => {
  it('standard', () => { expect(EASING_CUBIC_BEZIER.standard).toBe('cubic-bezier(0.4, 0, 0.2, 1)'); });
  it('emphasized and decelerate share the M3 decel curve', () => {
    expect(EASING_CUBIC_BEZIER.emphasized).toBe('cubic-bezier(0.05, 0.7, 0.1, 1)');
    expect(EASING_CUBIC_BEZIER.decelerate).toBe('cubic-bezier(0.05, 0.7, 0.1, 1)');
  });
  it('accelerate', () => { expect(EASING_CUBIC_BEZIER.accelerate).toBe('cubic-bezier(0.3, 0, 0.8, 0.15)'); });
  it('linear', () => { expect(EASING_CUBIC_BEZIER.linear).toBe('linear'); });
  it('resolveEasing falls back to standard for unknown', () => {
    expect(resolveEasing(undefined)).toBe(EASING_CUBIC_BEZIER.standard);
  });
});
