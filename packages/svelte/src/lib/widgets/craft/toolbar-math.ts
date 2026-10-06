// widgets/craft/toolbar-math.ts
// Where a floating ContextToolbar sits relative to its anchor (the selection's
// screen rect). Pure maths so the flip and clamp are testable without layout:
// floating-ui reports all-zero positions in jsdom.
//
// The bar centres over the anchor on the preferred side, flips to the other side
// when it doesn't fit, and is clamped inside the bounds with a margin. When the
// anchor is entirely outside the bounds (scrolled or panned away) it is hidden.
import type { ScreenRect } from './types.js';

export interface Size {
  width: number;
  height: number;
}

export interface ToolbarPlacement {
  x: number;
  y: number;
  side: 'top' | 'bottom';
  hidden: boolean;
}

export interface PlaceOptions {
  prefer?: 'top' | 'bottom';
  /** Space between the anchor and the bar. */
  gap?: number;
  /** Minimum space between the bar and the bounds' edge. */
  margin?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

export function placeToolbar(
  anchor: ScreenRect,
  size: Size,
  bounds: Size,
  { prefer = 'top', gap = 8, margin = 8 }: PlaceOptions = {},
): ToolbarPlacement {
  const hidden =
    anchor.x + anchor.width < 0 || anchor.y + anchor.height < 0 || anchor.x > bounds.width || anchor.y > bounds.height;
  const above = anchor.y - gap - size.height;
  const below = anchor.y + anchor.height + gap;
  const fitsAbove = above >= margin;
  const fitsBelow = below + size.height <= bounds.height - margin;
  let side = prefer;
  if (prefer === 'top' && !fitsAbove && fitsBelow) side = 'bottom';
  if (prefer === 'bottom' && !fitsBelow && fitsAbove) side = 'top';
  // Neither side fits (a selection taller than the view): the clamp lays the bar over it.
  const y = clamp(side === 'top' ? above : below, margin, bounds.height - margin - size.height);
  const x = clamp(anchor.x + anchor.width / 2 - size.width / 2, margin, bounds.width - margin - size.width);
  return { x: Math.round(x), y: Math.round(y), side, hidden };
}
