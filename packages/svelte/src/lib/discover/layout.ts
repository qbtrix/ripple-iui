// discover/layout.ts — the shared shapes of the Discover page layout: the three
// view modes, a filter option (a callback value, or a link when `href` is set),
// and the grid and list container classes the sections and the skeleton share.
// The classes are paw-enterprise's /discover markup, copied verbatim.

export type DiscoverView = 'grid' | 'shelves' | 'list';
export const DISCOVER_VIEWS: readonly DiscoverView[] = ['grid', 'shelves', 'list'];

/** One filter choice. With `href` it renders as a plain link, so a server-rendered
 *  page filters with JS off; without it the component calls back. */
export interface DiscoverOption {
  value: string;
  label: string;
  href?: string;
}

export const GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-x-5 gap-y-8';
export const LIST_CLASS = 'flex flex-col divide-y divide-border rounded-xl border border-border';
/** Bleeds into the page's px-6 gutter (-mx-6 px-6), so the parent must pad px-6. */
export const SHELF_CLASS =
  '-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-5 overflow-x-auto px-6 pb-3 [scrollbar-width:thin] *:w-64 *:shrink-0 *:snap-start';
