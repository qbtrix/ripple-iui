/**
 * @file schema/brand.ts
 * @description The portable BrandPack contract (SP-3, Pillar 2 / PRD Decision 4,
 *   contract C3). A versioned JSON design-token pack that re-skins a whole Ripple
 *   spec when applied at render. PURE TS (L1) — zod only, zero Svelte/runes — so a
 *   future React/Vue adapter (Decision 6) reuses this unchanged. The tokens map
 *   onto Ripple's existing CSS custom properties (theme.css `--ripple-*` + the
 *   shadcn base vars); `core/brand-applier.ts` does the mapping.
 *
 *   Design rules:
 *   - SEMVER + additive-only: never remove a token key. `version` is a free string
 *     semver; the `color` / `scale` / step maps are open `z.record`s so a pack may
 *     carry roles/steps beyond the documented set without failing validation.
 *   - Everything under `tokens` is optional. A minimal pack (`{id,name,version}`
 *     with no tokens) is valid and emits NO css vars — so an absent/empty brand
 *     keeps today's look exactly (no visual regression).
 * @created 2026-06-28 — SP-3 chunk 10 (BrandPack schema).
 */

import { z } from 'zod';

/**
 * A single semantic color, expressed once for light mode and (optionally) once
 * for dark. Values are any CSS color string (hex, hsl(), oklch(), …). When a
 * pack is applied in dark mode and a role has no `dark`, its `light` is reused.
 */
export const ColorToken = z.object({
  light: z.string(),
  dark: z.string().optional()
});
export type ColorToken = z.infer<typeof ColorToken>;

/**
 * One step of the type scale. `size` + `lineHeight` are CSS lengths; `weight` is
 * an optional numeric font-weight. Maps onto Tailwind v4's `--text-<step>` font
 * vars so existing `text-<step>` utilities re-skin (see brand-applier.ts).
 */
export const TypeScaleStep = z.object({
  size: z.string(),
  lineHeight: z.string(),
  weight: z.number().optional()
});
export type TypeScaleStep = z.infer<typeof TypeScaleStep>;

/** Font-family stacks. Each is a full CSS font-family value. */
export const BrandTypography = z.object({
  fontFamily: z
    .object({
      sans: z.string().optional(),
      serif: z.string().optional(),
      mono: z.string().optional()
    })
    .optional(),
  /** Open map of named steps (xs…7xl, or custom). Additive — extra keys allowed. */
  scale: z.record(z.string(), TypeScaleStep).optional()
});
export type BrandTypography = z.infer<typeof BrandTypography>;

/** Motion tokens — shared with the RFC 12 motion system + HyperFrames export. */
export const BrandMotion = z.object({
  duration: z.record(z.string(), z.string()).optional(),
  easing: z.record(z.string(), z.string()).optional()
});
export type BrandMotion = z.infer<typeof BrandMotion>;

/**
 * The token bundle. Every group is optional so a partial pack only drives the
 * tokens it declares. `color` is an open record keyed by semantic role
 * (primary, surface, border, …); see BRAND_COLOR_ROLES for the documented set.
 */
export const BrandTokens = z.object({
  color: z.record(z.string(), ColorToken).optional(),
  typography: BrandTypography.optional(),
  space: z.record(z.string(), z.string()).optional(),
  radius: z.record(z.string(), z.string()).optional(),
  shadow: z.record(z.string(), z.string()).optional(),
  motion: BrandMotion.optional()
});
export type BrandTokens = z.infer<typeof BrandTokens>;

/**
 * A portable brand-token pack. `id` / `name` / `version` are required identity;
 * `tokens` is optional (an identity-only pack is valid and a render no-op).
 * `assets` (logo/favicon) is reserved for v2 — accepted but not yet applied.
 */
export const BrandPack = z.object({
  id: z.string(),
  name: z.string(),
  /** SEMVER string. Additive-only across versions (never remove a token key). */
  version: z.string(),
  tokens: BrandTokens.optional(),
  assets: z
    .object({
      logo: z.string().optional(),
      favicon: z.string().optional()
    })
    .optional()
});
export type BrandPack = z.infer<typeof BrandPack>;

/** Throwing validator. */
export function parseBrandPack(input: unknown): BrandPack {
  return BrandPack.parse(input);
}

/** Non-throwing validator — returns { success, data, error }. */
export function safeParseBrandPack(input: unknown) {
  return BrandPack.safeParse(input);
}

/**
 * The documented semantic color roles. The schema accepts any string key
 * (additive extensibility), but these are the roles `brand-applier.ts` maps onto
 * named CSS vars and the editor widget surfaces by default. Each role drives both
 * a shadcn base var (so real widgets re-skin) and a `--ripple-*` var.
 */
export const BRAND_COLOR_ROLES = [
  'primary',
  'primaryForeground',
  'background',
  'foreground',
  'surface',
  'surfaceForeground',
  'muted',
  'mutedForeground',
  'secondary',
  'secondaryForeground',
  'accent',
  'accentForeground',
  'border',
  'ring',
  'destructive',
  'destructiveForeground',
  'success',
  'successForeground',
  'warning',
  'warningForeground',
  'info',
  'infoForeground'
] as const;
export type BrandColorRole = (typeof BRAND_COLOR_ROLES)[number];

/** The documented type-scale steps (a pack may carry more). */
export const BRAND_TYPE_STEPS = [
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl'
] as const;

/** The documented radius steps. `md` (or `base`/`DEFAULT`) is the canonical base. */
export const BRAND_RADIUS_STEPS = ['none', 'sm', 'md', 'lg', 'xl', 'full'] as const;

/** The documented spacing steps. */
export const BRAND_SPACE_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;

/** The documented shadow steps. */
export const BRAND_SHADOW_STEPS = ['sm', 'md', 'lg', 'xl'] as const;
