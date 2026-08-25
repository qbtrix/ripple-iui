// src/lib/systems/elevation.test.ts
// @file systems/elevation.test.ts
// @description Tests for the 8-step surface/elevation ladder level math
//   (nextElevation clamp, surfaceVar emission, ELEVATION_MAX cap).
// @created 2026-05-30 — RFC 12 premium pack, Phase 2 Task 2.4.

import { describe, expect, it } from 'vitest';
import { nextElevation, surfaceVar, ELEVATION_MAX } from './elevation.js';

describe('elevation ladder', () => {
  it('caps at 8', () => {
    expect(ELEVATION_MAX).toBe(8);
    expect(nextElevation(7, 3)).toBe(8);
    expect(nextElevation(8, 1)).toBe(8);
  });
  it('adds the offset to the substrate', () => {
    expect(nextElevation(1, 1)).toBe(2);
    expect(nextElevation(0, 1)).toBe(1);
  });
  it('floors at 1 (surface-1 is the base)', () => {
    expect(nextElevation(0, 0)).toBe(1);
  });
  it('surfaceVar emits the right custom-property reference', () => {
    expect(surfaceVar(3)).toBe('var(--surface-3)');
  });
});
