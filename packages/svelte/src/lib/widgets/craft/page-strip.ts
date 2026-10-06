// widgets/craft/page-strip.ts
// PageStrip's item type and its one piece of arithmetic: where a dragged page
// lands. Dropping page `from` before or after page `target` gives the index it
// should hold in the reordered list (the host splices it there), or null for a
// drop that changes nothing.

export interface PageItem {
  id: string;
  /** Accessible name; defaults to "Page N". */
  label?: string;
  /** Thumbnail URL (the engine's region render). */
  thumb?: string;
  /** Page size, for the thumbnail's aspect ratio. Square when absent. */
  width?: number;
  height?: number;
}

export const PAGE_MIME = 'application/x-ripple-page';

export function reorderIndex(from: number, target: number, after: boolean): number | null {
  let to = target + (after ? 1 : 0);
  if (from < to) to -= 1;
  return to === from ? null : to;
}
