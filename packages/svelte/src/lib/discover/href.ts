// discover/href.ts — the public route for one Discover item, by kind. Tools live
// under /free-tools/ because the docs site owns /tools/*.

import type { DiscoverKind } from './types.js';

const PREFIX: Partial<Record<DiscoverKind, string>> = {
  tool: '/free-tools/',
  game: '/play/',
  site: '/templates/',
};

export function itemHref(kind: DiscoverKind, idOrSlug: string): string {
  return `${PREFIX[kind] ?? '/discover/'}${encodeURIComponent(idOrSlug)}`;
}
