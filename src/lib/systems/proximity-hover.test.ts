// src/lib/systems/proximity-hover.test.ts
// @file systems/proximity-hover.test.ts
// @description Tests for the proximity helper (pure linear falloff) and the
//   proximityHover action (--proximity custom property, pointermove listener).
// @created 2026-05-30 — RFC 12 premium pack, Phase 2 Task 2.3.

import { describe, expect, it, vi } from 'vitest';
import { proximityHover, proximity } from './proximity-hover.js';

describe('proximity helper (pure)', () => {
  it('returns 1 at zero distance and 0 beyond radius', () => {
    expect(proximity(0, 200)).toBe(1);
    expect(proximity(200, 200)).toBe(0);
    expect(proximity(400, 200)).toBe(0);
  });
  it('is linear in between (0.5 at half radius)', () => {
    expect(proximity(100, 200)).toBeCloseTo(0.5, 5);
  });
});

describe('proximityHover action', () => {
  it('mounts, attaches a pointermove listener, and returns destroy', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const el = document.createElement('div');
    document.body.appendChild(el);
    const handle = proximityHover(el, { radius: 200 });
    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(typeof handle?.destroy).toBe('function');
    handle?.destroy?.();
    addSpy.mockRestore();
  });

  it('sets the --proximity custom property on mount (default 0)', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const handle = proximityHover(el, { radius: 200 });
    expect(el.style.getPropertyValue('--proximity')).toBe('0');
    handle?.destroy?.();
  });
});
