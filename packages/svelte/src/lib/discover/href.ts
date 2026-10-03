// discover/href.ts — the public route for one Discover item, by kind.

import type { DiscoverKind } from './types.js';

const PREFIX: Partial<Record<DiscoverKind, string>> = {
  tool: '/tools/',
  game: '/play/',
  site: '/templates/',
};

export function itemHref(kind: DiscoverKind, idOrSlug: string): string {
  return `${PREFIX[kind] ?? '/discover/'}${encodeURIComponent(idOrSlug)}`;
}
