// discover/index.ts — the `./discover` export subpath: a server-renderable
// Discover page for a public catalogue. The cards (tile, row, art, detail
// media), the page layout around them (header, search, chips, type bar,
// sections, skeleton, empty state, publish band), the item type they render,
// and the route helper for an item's own page. Pure components: props in,
// markup out; every control works by callback or as a plain link.

export { default as DiscoverTile } from './DiscoverTile.svelte';
export { default as DiscoverRow } from './DiscoverRow.svelte';
export { default as ItemArt } from './ItemArt.svelte';
export { default as DetailMedia } from './DetailMedia.svelte';
export { default as DiscoverHeader } from './DiscoverHeader.svelte';
export { default as DiscoverSearch } from './DiscoverSearch.svelte';
export { default as DiscoverChips } from './DiscoverChips.svelte';
export { default as DiscoverFilters } from './DiscoverFilters.svelte';
export { default as DiscoverSection } from './DiscoverSection.svelte';
export { default as DiscoverGrid } from './DiscoverGrid.svelte';
export { default as DiscoverSkeleton } from './DiscoverSkeleton.svelte';
export { default as DiscoverEmpty } from './DiscoverEmpty.svelte';
export { default as DiscoverPublish } from './DiscoverPublish.svelte';
export { itemHref } from './href.js';
export { tintFor, initialFor, CARD_PALETTE } from './art.js';
export { isStudioKind, primaryFor, mediaFor, usageLabel, remixLabel, usedLabel, type DiscoverPrimary } from './item.js';
export { DISCOVER_VIEWS, type DiscoverView, type DiscoverOption } from './layout.js';
export type { DiscoverItem, DiscoverKind, DiscoverMediaKind, StudioKind } from './types.js';
