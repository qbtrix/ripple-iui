// discover/index.ts — the `./discover` export subpath: a server-renderable card
// set for a public Discover catalogue. Pure components (props in, markup out),
// the item type they render, and the route helper for an item's own page.

export { default as DiscoverTile } from './DiscoverTile.svelte';
export { default as DiscoverRow } from './DiscoverRow.svelte';
export { default as ItemArt } from './ItemArt.svelte';
export { default as DetailMedia } from './DetailMedia.svelte';
export { itemHref } from './href.js';
export { tintFor, initialFor, CARD_PALETTE } from './art.js';
export { isStudioKind, primaryFor, mediaFor, usageLabel, remixLabel, usedLabel, type DiscoverPrimary } from './item.js';
export type { DiscoverItem, DiscoverKind, DiscoverMediaKind, StudioKind } from './types.js';
