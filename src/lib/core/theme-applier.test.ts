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

import { themeToCssVars, themeToStyleString } from './theme-applier.js';

describe('themeToCssVars', () => {
  it('maps color tokens to --token and --ripple-* custom properties', () => {
    const vars = themeToCssVars({ colors: { primary: '#1d4ed8', background: '#fff' } });
    expect(vars['--primary']).toBe('#1d4ed8');
    expect(vars['--background']).toBe('#fff');
  });
  it('maps radius to --radius', () => {
    expect(themeToCssVars({ radius: '0.75rem' })['--radius']).toBe('0.75rem');
  });
  it('maps fonts to --ripple-font-* vars', () => {
    const vars = themeToCssVars({ fonts: { sans: 'Inter', heading: 'Fraunces' } });
    expect(vars['--ripple-font-sans']).toBe('Inter');
    expect(vars['--ripple-font-heading']).toBe('Fraunces');
  });
  it('returns an empty map for an empty theme', () => {
    expect(themeToCssVars({})).toEqual({});
    expect(themeToCssVars(undefined)).toEqual({});
  });
  it('themeToStyleString serializes to a CSS declaration string', () => {
    const s = themeToStyleString({ colors: { primary: '#000' }, radius: '1rem' });
    expect(s).toContain('--primary: #000');
    expect(s).toContain('--radius: 1rem');
    expect(s.trim().endsWith(';')).toBe(true);
  });
});
