// widgets/craft/transform-math.ts
// Pure rect maths behind TransformBox, in DOCUMENT units (the same space as
// CanvasViewport's pointer events). Rects are {x, y, width, height}, y down.
//   moveRect     shift by (dx, dy), kept inside `bounds` when given
//   resizeRect   drag one of the 8 handles by (dx, dy): only that side moves;
//                with `aspect`, corners scale from the opposite corner by the
//                dominant axis and edges scale the other axis about its centre.
//                Never flips, never below `min`.
//   keyRect      a key press: arrows move by `step` (Shift: `bigStep`), Alt +
//                arrows grow / shrink from the far (se) corner, aspect-locked
//                when asked; null for other keys.
import type { CanvasRect, TransformHandle } from './types.js';

export interface ResizeOptions {
  aspect?: boolean;
  min?: number;
}

export function moveRect(r: CanvasRect, dx: number, dy: number, bounds?: CanvasRect | null): CanvasRect {
  let x = r.x + dx;
  let y = r.y + dy;
  if (bounds) {
    x = Math.max(bounds.x, Math.min(x, bounds.x + bounds.width - r.width));
    y = Math.max(bounds.y, Math.min(y, bounds.y + bounds.height - r.height));
  }
  return { x, y, width: r.width, height: r.height };
}

export function resizeRect(r: CanvasRect, h: TransformHandle, dx: number, dy: number, { aspect = false, min = 1 }: ResizeOptions = {}): CanvasRect {
  const west = h.includes('w');
  const east = h.includes('e');
  const north = h.includes('n');
  const south = h.includes('s');
  // The side being dragged moves; its opposite stays put. Clamp so it cannot cross.
  let w = east ? r.width + dx : west ? r.width - dx : r.width;
  let ht = south ? r.height + dy : north ? r.height - dy : r.height;
  w = Math.max(min, w);
  ht = Math.max(min, ht);
  if (aspect && r.width > 0 && r.height > 0) {
    const corner = (west || east) && (north || south);
    const k = corner ? (Math.abs(w / r.width - 1) >= Math.abs(ht / r.height - 1) ? w / r.width : ht / r.height) : west || east ? w / r.width : ht / r.height;
    const s = Math.max(k, min / Math.min(r.width, r.height));
    w = r.width * s;
    ht = r.height * s;
  }
  const x = west ? r.x + r.width - w : east ? r.x : r.x + (r.width - w) / 2;
  const y = north ? r.y + r.height - ht : south ? r.y : r.y + (r.height - ht) / 2;
  return { x, y, width: w, height: ht };
}

export function keyRect(
  r: CanvasRect,
  key: string,
  { shift = false, alt = false, aspect = false, step = 1, bigStep = 10, min = 1, bounds }: { shift?: boolean; alt?: boolean; aspect?: boolean; step?: number; bigStep?: number; min?: number; bounds?: CanvasRect | null }
): CanvasRect | null {
  const d = shift ? bigStep : step;
  const v = ({ ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] } as Record<string, [number, number]>)[key];
  if (!v) return null;
  return alt ? resizeRect(r, 'se', v[0], v[1], { aspect, min }) : moveRect(r, v[0], v[1], bounds);
}
