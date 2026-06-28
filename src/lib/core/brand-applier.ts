/**
 * @file core/brand-applier.ts
 * @description Apply-at-render for the BrandPack (SP-3 chunk 10 / PRD C3). Converts
 *   a portable `BrandPack` into a flat map of CSS custom-property declarations so
 *   `<Ripple brand={pack}>` re-skins a whole spec with one inline style on the
 *   ripple-root. Sibling to `theme-applier.ts` (RFC 12 `spec.theme`) — brand is the
 *   portable, versioned design-system layer; spec.theme stays the per-spec override.
 *
 *   Mapping strategy: each color role drives BOTH the shadcn base var the widgets
 *   already consume (`--primary`, `--card`, `--radius`, …) AND the `--ripple-*`
 *   namespace from theme.css, so the real catalog re-skins, not just ripple-aware
 *   widgets. Typography + scale + shadow also drive Tailwind v4 theme vars
 *   (`--font-sans`, `--text-<step>`, `--shadow-<step>`) so existing utility classes
 *   pick the brand up. Space / radius-steps / motion use the safe `--ripple-*`
 *   namespace.
 *
 *   Precedence (realized by WHERE Ripple places this in the root style string):
 *   explicit node prop > spec.theme > brand token > theme.css default. An absent or
 *   empty brand yields `{}` / '' — today's look exactly, no visual regression.
 *
 *   Dark mode: CSS vars set inline can't react to a `.dark` ancestor class, so the
 *   caller passes the active `mode`; each color role resolves to `dark ?? light`
 *   when mode is 'dark'. Non-color tokens are mode-independent. PURE; SSR-safe.
 * @created 2026-06-28 — SP-3 chunk 10 (brand apply-at-render).
 */

import type { BrandPack } from '../schema/brand.js';

export interface BrandApplyOptions {
  /** Which color slot to emit. 'dark' falls back to a role's light when no dark. */
  mode?: 'light' | 'dark';
}

/**
 * Semantic color role → the CSS custom properties it sets. Each role maps onto a
 * shadcn base var (widgets consume these directly) and, where one exists, the
 * matching `--ripple-*` token from theme.css. Roles not listed here fall back to a
 * single namespaced `--ripple-<kebab-role>` var (additive-safe for custom roles).
 */
const COLOR_ROLE_VARS: Record<string, string[]> = {
  primary: ['--primary', '--ripple-accent'],
  primaryForeground: ['--primary-foreground', '--ripple-accent-foreground'],
  background: ['--background'],
  foreground: ['--foreground'],
  surface: ['--card', '--popover', '--ripple-surface', '--ripple-input'],
  surfaceForeground: [
    '--card-foreground',
    '--popover-foreground',
    '--ripple-surface-foreground',
    '--ripple-input-foreground'
  ],
  muted: ['--muted', '--ripple-muted'],
  mutedForeground: ['--muted-foreground', '--ripple-muted-foreground'],
  secondary: ['--secondary'],
  secondaryForeground: ['--secondary-foreground'],
  accent: ['--accent'],
  accentForeground: ['--accent-foreground'],
  border: ['--border', '--input', '--ripple-border'],
  ring: ['--ring', '--ripple-ring'],
  destructive: ['--destructive', '--ripple-error'],
  destructiveForeground: ['--destructive-foreground', '--ripple-error-foreground'],
  success: ['--ripple-success'],
  successForeground: ['--ripple-success-foreground'],
  warning: ['--ripple-warning'],
  warningForeground: ['--ripple-warning-foreground'],
  info: ['--ripple-info'],
  infoForeground: ['--ripple-info-foreground']
};

/** camelCase / arbitrary role → kebab-case for the fallback `--ripple-*` var. */
function kebab(role: string): string {
  return role
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/** Tailwind v4 font-family var name for a fontFamily key (sans/serif/mono). */
const FONT_FAMILY_VARS: Record<string, string[]> = {
  sans: ['--font-sans', '--ripple-font-sans'],
  serif: ['--font-serif', '--ripple-font-serif'],
  mono: ['--font-mono', '--ripple-font-mono']
};

/**
 * Convert a BrandPack into a `{ '--token': value }` map (plus the bare
 * `font-family` declaration so the ripple-root subtree inherits the sans stack).
 * Empty when the pack is absent or declares no tokens.
 */
export function brandToCssVars(
  brand: BrandPack | undefined | null,
  opts: BrandApplyOptions = {}
): Record<string, string> {
  if (!brand?.tokens) return {};
  const mode = opts.mode ?? 'light';
  const vars: Record<string, string> = {};
  const t = brand.tokens;

  // --- Color roles ---------------------------------------------------------
  if (t.color) {
    for (const [role, token] of Object.entries(t.color)) {
      if (!token) continue;
      const value = mode === 'dark' ? token.dark ?? token.light : token.light;
      if (!value) continue;
      const targets = COLOR_ROLE_VARS[role] ?? [`--ripple-${kebab(role)}`];
      for (const name of targets) vars[name] = value;
    }
  }

  // --- Typography: families + type scale -----------------------------------
  if (t.typography?.fontFamily) {
    for (const [key, stack] of Object.entries(t.typography.fontFamily)) {
      if (!stack) continue;
      for (const name of FONT_FAMILY_VARS[key] ?? [`--ripple-font-${kebab(key)}`]) {
        vars[name] = stack;
      }
    }
    // The bare property so the whole ripple-root subtree inherits the body font.
    if (t.typography.fontFamily.sans) vars['font-family'] = t.typography.fontFamily.sans;
  }
  if (t.typography?.scale) {
    for (const [step, s] of Object.entries(t.typography.scale)) {
      if (!s) continue;
      // Tailwind v4 reads --text-<step> (+ paired --line-height / --font-weight)
      // for `text-<step>` utilities, so existing widgets re-skin. Also expose a
      // plain --ripple-text-<step> for direct authoring.
      if (s.size) {
        vars[`--text-${step}`] = s.size;
        vars[`--ripple-text-${step}`] = s.size;
      }
      if (s.lineHeight) vars[`--text-${step}--line-height`] = s.lineHeight;
      if (s.weight != null) {
        vars[`--text-${step}--font-weight`] = String(s.weight);
        vars[`--ripple-weight-${step}`] = String(s.weight);
      }
    }
  }

  // --- Radius: canonical base drives --radius; all steps namespaced --------
  if (t.radius) {
    const base = t.radius.base ?? t.radius.DEFAULT ?? t.radius.md ?? t.radius.lg;
    if (base) {
      vars['--radius'] = base;
      vars['--ripple-radius'] = base;
    }
    for (const [step, value] of Object.entries(t.radius)) {
      if (value) vars[`--ripple-radius-${step}`] = value;
    }
  }

  // --- Spacing: namespaced (Tailwind's global --spacing left untouched) -----
  if (t.space) {
    for (const [step, value] of Object.entries(t.space)) {
      if (value) vars[`--ripple-space-${step}`] = value;
    }
  }

  // --- Shadow: Tailwind v4 --shadow-<step> + namespaced --------------------
  if (t.shadow) {
    for (const [step, value] of Object.entries(t.shadow)) {
      if (!value) continue;
      vars[`--shadow-${step}`] = value;
      vars[`--ripple-shadow-${step}`] = value;
    }
  }

  // --- Motion: namespaced (shared with RFC 12 + HyperFrames) ---------------
  if (t.motion?.duration) {
    for (const [k, value] of Object.entries(t.motion.duration)) {
      if (value) vars[`--ripple-duration-${k}`] = value;
    }
  }
  if (t.motion?.easing) {
    for (const [k, value] of Object.entries(t.motion.easing)) {
      if (value) vars[`--ripple-ease-${k}`] = value;
    }
  }

  return vars;
}

/** Same as brandToCssVars but serialized for an inline `style` attribute. */
export function brandToStyleString(
  brand: BrandPack | undefined | null,
  opts: BrandApplyOptions = {}
): string {
  const vars = brandToCssVars(brand, opts);
  const decls = Object.entries(vars).map(([k, v]) => `${k}: ${v}`);
  return decls.length ? decls.join('; ') + ';' : '';
}
