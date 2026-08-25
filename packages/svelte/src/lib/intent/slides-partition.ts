/**
 * @file slides-partition.ts
 * @description Pure helpers for the `slides` intent layout (SP-4). Splits a
 * UniversalSpec into an ordered list of slide nodes and clamps a slide index to
 * the deck range. Kept framework-free (no Svelte) so the partition rule is unit
 * testable without a DOM or the Ripple context.
 *
 * Partition order (first non-empty source wins):
 *   1. `spec.sections` — an explicit, ordered array of slide nodes. Not a core
 *      UniversalSpec field, so it only survives when the spec reaches the layout
 *      un-normalized (e.g. a direct render or a test); read defensively via a
 *      cast. Supported because the SP-4 brief asks the layout to "handle both".
 *   2. `spec.ui.children` — the canonical live path: each top-level child of the
 *      root `ui` node becomes one slide.
 *   3. `spec.ui` — a single-slide fallback when the root has no children.
 *   4. `[]` — nothing renderable.
 *
 * @created 2026-06-28 (SP-4 — slides intent layout)
 */

import { type UINode, type UniversalSpec } from '@ripple-ui/core';

/** A spec that may also carry the optional, non-core `sections` slide array. */
type SlidesSpec = (UniversalSpec | { ui?: UINode; sections?: unknown }) & {
  sections?: unknown;
};

/** Truthy object guard — a renderable slide node is at minimum a non-null object. */
function isNode(value: unknown): value is UINode {
  return !!value && typeof value === 'object';
}

/**
 * Split a spec into its ordered slide nodes. Each returned node is rendered as
 * one full-bleed slide through NodeRenderer. See the file header for the source
 * precedence; the result is always a fresh array (never the spec's own array).
 */
export function partitionSlides(spec: SlidesSpec | null | undefined): UINode[] {
  if (!spec || typeof spec !== 'object') return [];

  // 1. Explicit sections array (handled defensively — not a core spec field).
  const sections = spec.sections;
  if (Array.isArray(sections)) {
    const slides = sections.filter(isNode);
    if (slides.length > 0) return slides;
  }

  // 2. Canonical path: each child of the root ui node is a slide.
  const ui = (spec as { ui?: UINode }).ui;
  const children = ui?.children;
  if (Array.isArray(children)) {
    const slides = children.filter(isNode);
    if (slides.length > 0) return slides;
  }

  // 3. Single-slide fallback: the whole ui tree is one slide.
  if (isNode(ui)) return [ui];

  // 4. Nothing to present.
  return [];
}

/**
 * Clamp a slide index into the valid range `[0, total - 1]`. An empty deck
 * (total <= 0) clamps to 0. Used for Prev/Next/dot navigation so the deck never
 * lands out of bounds (no wrap-around — first/last are hard stops).
 */
export function clampIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  if (!Number.isFinite(index) || index < 0) return 0;
  if (index > total - 1) return total - 1;
  return Math.floor(index);
}
