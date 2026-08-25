/**
 * @file editor/core/geometry.ts
 * @description L1 (PURE TS, zero Svelte/rune imports) rect math for the Ripple
 *   visual-editor overlay. `pointInRect` and `rectToStyle` are lifted from
 *   svelte-visual-builder's `editor-svelte/src/lib/canvas.ts` and re-typed onto
 *   a plain `Rect` ({left,top,right,bottom,width,height}) so a future React/Vue
 *   L2 can reuse them unchanged (Decision 6). No DOM is queried here — callers
 *   pass rects in; the thin DOM-reading boundary lives in `bounds-index.ts`.
 * @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
 */

/** A plain axis-aligned rectangle. A browser `DOMRect` is structurally assignable. */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** True when (x, y) falls within `rect` (edges inclusive). */
export function pointInRect(rect: Rect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/** Absolutely-positioned CSS for a box matching `rect` (left/top/width/height). */
export function rectToStyle(rect: Rect): string {
  return `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
}

/** Area of a rect — used to pick the innermost (smallest) hit in a point test. */
export function rectArea(rect: Rect): number {
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

/**
 * Re-base an absolute (viewport) rect onto an origin — typically a render
 * container's top-left — so the overlay can position boxes relative to that
 * container instead of the viewport. Pure arithmetic; `input` may be a `DOMRect`
 * the caller read via getBoundingClientRect (structurally a `Rect`).
 */
export function relativeRect(input: Rect, origin: { left: number; top: number }): Rect {
  return {
    left: input.left - origin.left,
    top: input.top - origin.top,
    right: input.right - origin.left,
    bottom: input.bottom - origin.top,
    width: input.width,
    height: input.height
  };
}
