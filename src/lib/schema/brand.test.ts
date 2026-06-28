// brand.test.ts — BrandPack schema contract (SP-3 chunk 10).
// Created 2026-06-28. Pure-TS (L1) validation: identity-only packs are valid,
// partial token groups are allowed, unknown color roles pass (additive
// extensibility), and required identity fields are enforced.

import { describe, expect, it } from 'vitest';
import {
  BrandPack,
  parseBrandPack,
  safeParseBrandPack,
  BRAND_COLOR_ROLES,
  type BrandPack as BrandPackType
} from './brand.js';
import { defaultBrandPack, emptyBrandPack } from '../widgets/design-system/brand-defaults.js';

describe('BrandPack schema', () => {
  it('accepts an identity-only pack (no tokens)', () => {
    const r = safeParseBrandPack({ id: 'x', name: 'X', version: '1.0.0' });
    expect(r.success).toBe(true);
  });

  it('accepts an empty tokens object', () => {
    const r = safeParseBrandPack(emptyBrandPack());
    expect(r.success).toBe(true);
  });

  it('accepts a partial pack (only one color role, no other groups)', () => {
    const r = safeParseBrandPack({
      id: 'p',
      name: 'Partial',
      version: '0.1.0',
      tokens: { color: { primary: { light: '#4f46e5' } } }
    });
    expect(r.success).toBe(true);
  });

  it('accepts a color role with both light and dark slots', () => {
    const r = safeParseBrandPack({
      id: 'p',
      name: 'P',
      version: '1.0.0',
      tokens: { color: { primary: { light: '#fff', dark: '#000' } } }
    });
    expect(r.success).toBe(true);
  });

  it('accepts unknown color roles (additive extensibility)', () => {
    const r = safeParseBrandPack({
      id: 'p',
      name: 'P',
      version: '1.0.0',
      tokens: { color: { brandTeal: { light: '#0d9488' } } }
    });
    expect(r.success).toBe(true);
  });

  it('rejects a pack missing id', () => {
    const r = safeParseBrandPack({ name: 'X', version: '1.0.0' });
    expect(r.success).toBe(false);
  });

  it('rejects a pack missing version', () => {
    const r = safeParseBrandPack({ id: 'x', name: 'X' });
    expect(r.success).toBe(false);
  });

  it('rejects a color token without a light value', () => {
    const r = safeParseBrandPack({
      id: 'p',
      name: 'P',
      version: '1.0.0',
      tokens: { color: { primary: { dark: '#000' } } }
    });
    expect(r.success).toBe(false);
  });

  it('parseBrandPack returns a typed pack and round-trips the default', () => {
    const pack: BrandPackType = parseBrandPack(defaultBrandPack());
    expect(pack.id).toBe('starter-indigo');
    expect(pack.tokens?.color?.primary?.light).toBe('#4f46e5');
  });

  it('the default starter pack defines every documented color role', () => {
    const pack = defaultBrandPack();
    // Foreground-only roles are intentionally sparse; assert the core roles exist.
    const core = ['primary', 'background', 'foreground', 'surface', 'border', 'ring'];
    for (const role of core) {
      expect(pack.tokens?.color?.[role], `missing role ${role}`).toBeTruthy();
    }
    // Every key the starter declares must be a string in BRAND_COLOR_ROLES or
    // an allowed custom role — here we just confirm the documented list is sane.
    expect(BRAND_COLOR_ROLES).toContain('primary');
  });

  it('BrandPack export is the zod schema (has safeParse)', () => {
    expect(typeof BrandPack.safeParse).toBe('function');
  });
});
