// widgets/craft/viewport-math.ts
// Pure pan/zoom maths behind CanvasViewport. Screen coordinates here are
// viewport-local CSS pixels (clientX minus the viewport's left edge). The one
// invariant: document point d sits at screen point pan + d * zoom.
import type { ViewTransform } from './types.js';

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function screenToDoc(sx: number, sy: number, t: ViewTransform) {
  return { x: (sx - t.panX) / t.zoom, y: (sy - t.panY) / t.zoom };
}

export function docToScreen(x: number, y: number, t: ViewTransform) {
  return { x: t.panX + x * t.zoom, y: t.panY + y * t.zoom };
}

/** Zoom to `zoom` (clamped) keeping the document point under (sx, sy) fixed. */
export function zoomAt(t: ViewTransform, zoom: number, sx: number, sy: number, min = 0.02, max = 64): ViewTransform {
  const z = clamp(zoom, min, max);
  const d = screenToDoc(sx, sy, t);
  return { zoom: z, panX: sx - d.x * z, panY: sy - d.y * z };
}

/** The transform that fits a docW x docH document, centred, inside viewW x viewH. */
export function fitTransform(
  viewW: number,
  viewH: number,
  docW: number,
  docH: number,
  padding = 32,
  min = 0.02,
  max = 64
): ViewTransform {
  const availW = Math.max(1, viewW - padding * 2);
  const availH = Math.max(1, viewH - padding * 2);
  const zoom = clamp(Math.min(availW / Math.max(1, docW), availH / Math.max(1, docH)), min, max);
  return { zoom, panX: (viewW - docW * zoom) / 2, panY: (viewH - docH * zoom) / 2 };
}
