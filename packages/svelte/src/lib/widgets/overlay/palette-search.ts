// widgets/overlay/palette-search.ts
// The item model and ranking behind CommandPalette. Pure, so the scorer is
// tested directly and stays fast over a large source (≈1,600 editor commands
// plus templates): `preparePalette` lowercases every searchable field once per
// item list, and `searchPalette` only does string tests per keystroke.
//
// Every whitespace-separated token must match somewhere (AND). A token scores by
// where it lands: label prefix 80, label word start 60, label substring 40,
// alias 0.9x those, menu path / keywords / group 25, description 10, and a
// fuzzy in-order match on the label (up to 15, tighter is better). An exact
// label match gets a bonus; ties go to the shorter label.

export interface PaletteItem {
  id: string;
  label: string;
  /** Section heading, e.g. "Commands", "Templates", "Elements", "Pages". */
  group?: string;
  /** Other words a person might type ("bin" for Delete). */
  aliases?: string[];
  keywords?: string[];
  /** Where it lives in the menus, e.g. "Object > Arrange > Bring to front". */
  menu?: string;
  description?: string;
  /** Shortcut hint, shown as typed, e.g. "⌘D". */
  shortcut?: string;
  /** Lucide icon slug. */
  icon?: string;
  /** Thumbnail image URL (templates, elements, pages). Wins over `icon`. */
  thumb?: string;
  disabled?: boolean;
}

export interface PreparedItem {
  item: PaletteItem;
  label: string;
  aliases: string[];
  rest: string;
  description: string;
}

export function preparePalette(items: PaletteItem[]): PreparedItem[] {
  const out: PreparedItem[] = [];
  for (const item of items) {
    if (item.disabled) continue;
    out.push({
      item,
      label: item.label.toLowerCase(),
      aliases: (item.aliases ?? []).map((a) => a.toLowerCase()),
      rest: [item.menu ?? '', ...(item.keywords ?? []), item.group ?? ''].join(' ').toLowerCase(),
      description: (item.description ?? '').toLowerCase(),
    });
  }
  return out;
}

const WORD_START = /[\s>/._:-]/;

function tier(text: string, t: string): number {
  const at = text.indexOf(t);
  if (at < 0) return 0;
  if (at === 0) return 80;
  if (WORD_START.test(text[at - 1])) return 60;
  // A later occurrence may still sit on a word start ("ring" in "bring to ring").
  for (let i = text.indexOf(t, at + 1); i > 0; i = text.indexOf(t, i + 1)) {
    if (WORD_START.test(text[i - 1])) return 60;
  }
  return 40;
}

/** In-order character match: 15 for a contiguous run, less as it spreads out. */
function fuzzy(text: string, t: string): number {
  let i = 0;
  let first = -1;
  let last = -1;
  for (let k = 0; k < text.length && i < t.length; k++) {
    if (text[k] === t[i]) {
      if (first < 0) first = k;
      last = k;
      i++;
    }
  }
  if (i < t.length) return 0;
  const spread = last - first + 1 - t.length;
  return Math.max(1, 15 - spread);
}

export function scorePalette(p: PreparedItem, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  let total = 0;
  for (const t of q.split(/\s+/)) {
    let best = tier(p.label, t);
    for (const a of p.aliases) best = Math.max(best, tier(a, t) * 0.9);
    if (best < 25 && p.rest.includes(t)) best = 25;
    if (best < 10 && p.description.includes(t)) best = 10;
    if (best === 0) best = fuzzy(p.label, t);
    if (best === 0) return 0;
    total += best;
  }
  if (p.label === q) total += 50;
  return total - p.label.length * 0.01;
}

/** Ranked matches, capped at `limit`. `total` is the uncapped match count. */
export function searchPalette(index: PreparedItem[], query: string, limit = 50) {
  const hits: { item: PaletteItem; s: number }[] = [];
  for (const p of index) {
    const s = scorePalette(p, query);
    if (s > 0) hits.push({ item: p.item, s });
  }
  hits.sort((a, b) => b.s - a.s);
  return { items: hits.slice(0, limit).map((h) => h.item), total: hits.length };
}
