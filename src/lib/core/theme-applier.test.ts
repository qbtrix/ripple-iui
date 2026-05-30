// src/lib/core/theme-applier.test.ts
// @description Tests for the white-label theme layer: ThemeOverrides font/logo
//   tokens (Task 4.1) + the theme-applier emitting CSS custom properties from
//   spec.theme (Task 4.2).
// @created 2026-05-30 — RFC 12 theme-applier.
import { describe, expect, it } from 'vitest';
import { ThemeOverrides } from '../schema/ui-spec.js';

describe('ThemeOverrides font + logo tokens', () => {
  it('accepts a fonts block (sans / serif / mono / heading)', () => {
    const r = ThemeOverrides.safeParse({ fonts: { sans: 'Inter, sans-serif', heading: 'Fraunces, serif' } });
    expect(r.success).toBe(true);
  });
  it('accepts a logo block (src / alt / darkSrc)', () => {
    const r = ThemeOverrides.safeParse({ logo: { src: 'https://cdn/logo.svg', alt: 'BrightSmile', darkSrc: 'https://cdn/logo-dark.svg' } });
    expect(r.success).toBe(true);
  });
  it('still accepts a colors-only theme (backwards compatible)', () => {
    expect(ThemeOverrides.safeParse({ colors: { primary: '#1d4ed8' }, radius: '0.75rem' }).success).toBe(true);
  });
});
