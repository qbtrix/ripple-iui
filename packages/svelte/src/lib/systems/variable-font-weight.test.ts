// src/lib/systems/variable-font-weight.test.ts
// @file systems/variable-font-weight.test.ts
// @description Tests for the variable-font-weight transition util (wghtStyle +
//   the animateWght action).
// @created 2026-05-30 — RFC 12 premium pack, Phase 2 Task 2.2.

import { describe, expect, it } from 'vitest';
import { wghtStyle, animateWght } from './variable-font-weight.js';

describe('variable font weight', () => {
  it('wghtStyle emits a font-variation-settings declaration', () => {
    expect(wghtStyle(650)).toBe("font-variation-settings: 'wght' 650");
  });
  it('animateWght sets the resting weight on the element immediately', () => {
    const el = document.createElement('span');
    const handle = animateWght(el, { from: 400, to: 700 });
    expect(el.style.getPropertyValue('font-variation-settings')).toContain('400');
    handle?.destroy?.();
  });
  it('animateWght returns a destroy fn', () => {
    const el = document.createElement('span');
    const handle = animateWght(el, { from: 400, to: 700 });
    expect(typeof handle?.destroy).toBe('function');
    handle?.destroy?.();
  });
});
