// widgets/craft/asset-panel.ts
// The data model of AssetPanel and the drag contract between the panel and a
// canvas. A dragged tile carries an `AssetDrop` as JSON under ASSET_MIME (plus
// its label as text/plain); the canvas reads it back with `readAssetDrop`.
// `filterAssets` is the panel's local search: every query token must appear in
// the label or a tag, and an active filter chip must be one of the item's tags.
// `gridColumns` is the column count the grid's Up/Down keys step by.

export const ASSET_MIME = 'application/x-ripple-asset+json';

export interface AssetFilter {
  id: string;
  label: string;
}

export interface AssetTab {
  id: string;
  label: string;
  /** Lucide icon slug for the rail; the `icon` snippet overrides it. */
  icon?: string;
  /** Search box placeholder, e.g. "Search templates". */
  placeholder?: string;
  /** Filter chips; an item matches a chip when its `tags` include the chip id. */
  filters?: AssetFilter[];
  emptyText?: string;
  /** Show the label under each tile. Default true. */
  captions?: boolean;
}

export interface AssetItem {
  id: string;
  label: string;
  /** Thumbnail URL, lazy-loaded. */
  thumb?: string;
  /** Natural size, for the tile's aspect ratio. Square when absent. */
  width?: number;
  height?: number;
  tags?: string[];
  /** The host's own type ("template", "element", "text-preset", "upload"…). */
  kind?: string;
  /** Text drawn in the tile when there is no thumbnail (text presets). */
  preview?: string;
  /** Anything the host needs on insert or drop (template id, command args). */
  data?: unknown;
}

/** What a canvas receives from a dropped tile. */
export interface AssetDrop {
  tab: string;
  id: string;
  label: string;
  kind?: string;
  data?: unknown;
}

export function assetDrop(item: AssetItem, tab: string): AssetDrop {
  return { tab, id: item.id, label: item.label, kind: item.kind, data: item.data };
}

/** Write a tile's payload onto a drag. */
export function writeAssetDrag(dt: DataTransfer, item: AssetItem, tab: string): void {
  dt.setData(ASSET_MIME, JSON.stringify(assetDrop(item, tab)));
  dt.setData('text/plain', item.label);
  dt.effectAllowed = 'copy';
}

/** Read a dropped tile, or null when the drop is not an asset (a file, plain text). */
export function readAssetDrop(dt: DataTransfer | null | undefined): AssetDrop | null {
  const raw = dt?.getData(ASSET_MIME);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as AssetDrop;
    return v && typeof v.id === 'string' && typeof v.tab === 'string' ? v : null;
  } catch {
    return null;
  }
}

/** True while a drag carries an asset (dragover can't read the data, only the types). */
export function isAssetDrag(dt: DataTransfer | null | undefined): boolean {
  return !!dt && Array.from(dt.types ?? []).includes(ASSET_MIME);
}

export function filterAssets(items: AssetItem[], query: string, chip: string | null): AssetItem[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((it) => {
    if (chip && !it.tags?.includes(chip)) return false;
    if (!tokens.length) return true;
    const hay = [it.label, ...(it.tags ?? [])].join(' ').toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}

/** Columns in the tile grid: the browser's resolved tracks, or (when it reports the
 *  unresolved `repeat(...)`, as jsdom does) what auto-fill fits at this width. */
export function gridColumns(templateColumns: string, width: number, minTile: number, gap = 8): number {
  const tracks = templateColumns.trim();
  if (tracks && !tracks.startsWith('repeat(')) return tracks.split(/\s+/).length;
  return Math.max(1, Math.floor((width + gap) / (minTile + gap)));
}
