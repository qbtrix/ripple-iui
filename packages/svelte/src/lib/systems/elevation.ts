// src/lib/systems/elevation.ts
// @file systems/elevation.ts
// @description 8-step surface/elevation ladder. `nextElevation` computes a
//   child's level from its substrate + an offset, capped at 8 and floored at 1.
//   Pair with the Elevated helper to re-provide the level via Svelte context so
//   nested surfaces stack predictably. CSS tokens live in elevation.css.
// @provenance Ported from Fluid Functionalism (github.com/mickadesign/
//   fluid-functionalism, MIT) — systems only.
// @created 2026-05-30 — RFC 12 premium pack, FF systems layer.

import { getContext, setContext } from 'svelte';

export const ELEVATION_MAX = 8;
const ELEVATION_KEY = 'ripple-elevation';

/** child level = clamp(substrate + offset, 1, 8). */
export function nextElevation(substrate: number, offset: number): number {
  return Math.max(1, Math.min(ELEVATION_MAX, substrate + offset));
}

export function surfaceVar(level: number): string {
  return `var(--surface-${Math.max(1, Math.min(ELEVATION_MAX, level))})`;
}

/** Read the current substrate level from context (defaults to 1). */
export function currentElevation(): number {
  return getContext<number>(ELEVATION_KEY) ?? 1;
}

/** Re-provide an elevated level to descendants. Call in a component's script. */
export function provideElevation(offset = 1): number {
  const level = nextElevation(currentElevation(), offset);
  setContext(ELEVATION_KEY, level);
  return level;
}
