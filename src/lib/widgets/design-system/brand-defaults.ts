/**
 * @file widgets/design-system/brand-defaults.ts
 * @description Starter BrandPacks for the design-system editor (SP-3 chunk 11).
 *   PURE TS (L1) — no Svelte — so the same defaults seed the editor, tests, and a
 *   future React/Vue adapter. `defaultBrandPack()` returns a full, well-formed
 *   indigo pack (light + dark slots, a type scale, radius / space / shadow / motion
 *   steps) so the editor opens with sensible values and every control has a value
 *   to bind. `emptyBrandPack()` is identity-only — applying it is a render no-op,
 *   demonstrating "absent/empty brand = today's look exactly".
 * @created 2026-06-28 — SP-3 chunk 11 (editor defaults).
 */

import type { BrandPack } from '../../schema/brand.js';

/** A valid pack that declares no tokens — applying it emits zero CSS vars. */
export function emptyBrandPack(): BrandPack {
  return { id: 'empty', name: 'No brand', version: '1.0.0', tokens: {} };
}

/**
 * A full indigo starter pack. Hex values so the editor's native color inputs
 * round-trip cleanly. Approximates a polished light/dark theme distinct enough
 * from the bare default that applying it is a visible re-skin.
 */
export function defaultBrandPack(): BrandPack {
  return {
    id: 'starter-indigo',
    name: 'Indigo Starter',
    version: '1.0.0',
    tokens: {
      color: {
        primary: { light: '#4f46e5', dark: '#818cf8' },
        primaryForeground: { light: '#ffffff', dark: '#0b1020' },
        background: { light: '#ffffff', dark: '#0b1020' },
        foreground: { light: '#0f172a', dark: '#e2e8f0' },
        surface: { light: '#ffffff', dark: '#131a2e' },
        surfaceForeground: { light: '#0f172a', dark: '#e2e8f0' },
        muted: { light: '#f1f5f9', dark: '#1e293b' },
        mutedForeground: { light: '#64748b', dark: '#94a3b8' },
        secondary: { light: '#f1f5f9', dark: '#1e293b' },
        secondaryForeground: { light: '#0f172a', dark: '#e2e8f0' },
        accent: { light: '#eef2ff', dark: '#1e1b4b' },
        accentForeground: { light: '#3730a3', dark: '#c7d2fe' },
        border: { light: '#e2e8f0', dark: '#243049' },
        ring: { light: '#4f46e5', dark: '#818cf8' },
        destructive: { light: '#dc2626', dark: '#f87171' },
        destructiveForeground: { light: '#ffffff', dark: '#0b1020' },
        success: { light: '#16a34a', dark: '#4ade80' },
        warning: { light: '#d97706', dark: '#fbbf24' },
        info: { light: '#2563eb', dark: '#60a5fa' }
      },
      typography: {
        fontFamily: {
          sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
          serif: 'Georgia, ui-serif, serif',
          mono: 'ui-monospace, SFMono-Regular, Menlo, monospace'
        },
        scale: {
          xs: { size: '0.75rem', lineHeight: '1rem' },
          sm: { size: '0.875rem', lineHeight: '1.25rem' },
          base: { size: '1rem', lineHeight: '1.5rem' },
          lg: { size: '1.125rem', lineHeight: '1.75rem' },
          xl: { size: '1.25rem', lineHeight: '1.75rem', weight: 600 },
          '2xl': { size: '1.5rem', lineHeight: '2rem', weight: 600 },
          '3xl': { size: '1.875rem', lineHeight: '2.25rem', weight: 700 },
          '4xl': { size: '2.25rem', lineHeight: '2.5rem', weight: 700 }
        }
      },
      space: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem'
      },
      radius: {
        none: '0px',
        sm: '0.25rem',
        md: '0.625rem',
        lg: '0.875rem',
        xl: '1.25rem',
        full: '9999px'
      },
      shadow: {
        sm: '0 1px 2px 0 rgb(15 23 42 / 0.06)',
        md: '0 4px 12px -2px rgb(15 23 42 / 0.10)',
        lg: '0 12px 32px -8px rgb(15 23 42 / 0.18)',
        xl: '0 24px 56px -16px rgb(15 23 42 / 0.24)'
      },
      motion: {
        duration: { fast: '120ms', base: '220ms', slow: '420ms' },
        easing: {
          standard: 'cubic-bezier(0.2, 0, 0, 1)',
          emphasized: 'cubic-bezier(0.3, 0, 0, 1.2)'
        }
      }
    }
  };
}
