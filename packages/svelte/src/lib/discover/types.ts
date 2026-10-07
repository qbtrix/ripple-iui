// discover/types.ts — the item shape the Discover card set renders. A flattened
// view of one public catalogue listing: enough to draw a tile, a row, or the
// detail media on the server, with no fetch and no store. Consumers map their
// wire format onto this; the components derive everything else (labels, the
// primary action, the studio flag) from these fields.

export type StudioKind = 'image' | 'video' | 'music';
export type DiscoverKind = 'site' | 'tool' | 'game' | StudioKind;
/** How the media plays: a song's kind is 'music' but its media is 'audio'. */
export type DiscoverMediaKind = 'image' | 'video' | 'audio';

export interface DiscoverItem {
  id: string;
  /** Used for the public href when set; falls back to id. */
  slug?: string;
  kind: DiscoverKind;
  /** Null for site templates, tools and games. */
  mediaKind: DiscoverMediaKind | null;
  title: string;
  desc: string;
  /** Preview picture (a studio image itself, a video's poster), or null for the placeholder. */
  imageUrl: string | null;
  /** The studio media the detail view plays. */
  mediaUrl?: string | null;
  /** Where Use / Play opens. Null when there is no live page. */
  liveUrl?: string | null;
  /** Copies made; for a studio listing, times its recipe was opened. */
  remixCount: number;
  featured: boolean;
}
