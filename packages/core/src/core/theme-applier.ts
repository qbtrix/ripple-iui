// src/lib/core/theme-applier.ts
// @file core/theme-applier.ts
// @description The white-label keystone. Converts spec.theme (ThemeOverrides)
//   into a flat map of CSS custom-property declarations, so a host can apply
//   the pocket's brand to the DOM with one inline style on the ripple-root.
//   Ripple parsed theme before but never applied it; this closes that gap.
//   Architecture follows Skeleton v3 (MIT) — CSS custom properties, not a
//   compiled stylesheet. Pure; SSR-safe (no DOM access).
// @created 2026-05-30 — RFC 12 theme-applier.

import type { ThemeOverrides } from '../schema/ui-spec.js';

/** spec.theme -> { '--token': value } map. Empty when nothing to apply. */
export function themeToCssVars(theme: ThemeOverrides | undefined): Record<string, string> {
  if (!theme) return {};
  const vars: Record<string, string> = {};

  // Colors map 1:1 to the shadcn token names the widgets already consume.
  if (theme.colors) {
    for (const [token, value] of Object.entries(theme.colors)) {
      if (typeof value === 'string' && value) vars[`--${token}`] = value;
    }
  }
  if (theme.radius) vars['--radius'] = theme.radius;
  if (theme.fonts) {
    if (theme.fonts.sans) vars['--ripple-font-sans'] = theme.fonts.sans;
    if (theme.fonts.serif) vars['--ripple-font-serif'] = theme.fonts.serif;
    if (theme.fonts.mono) vars['--ripple-font-mono'] = theme.fonts.mono;
    if (theme.fonts.heading) vars['--ripple-font-heading'] = theme.fonts.heading;
  }
  return vars;
}

/** Same as themeToCssVars but serialized for an inline `style` attribute. */
export function themeToStyleString(theme: ThemeOverrides | undefined): string {
  const vars = themeToCssVars(theme);
  const decls = Object.entries(vars).map(([k, v]) => `${k}: ${v}`);
  return decls.length ? decls.join('; ') + ';' : '';
}
