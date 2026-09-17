/**
 * @file widgets/display/diff-rows.ts
 * @description NEW (2026-09-17, beautiful-ui re-skin, skin-diff). The row model
 *   behind display/Diff.svelte's re-skin, kept out of the component so it can be
 *   tested without the lazy `import('diff')` the widget does.
 *
 *   origin: slev12397/beautiful-ui@ff0f74d components/primitives/CodeBlock.tsx
 *   (its `DiffRow`/`CodePiece` shape, which the source writes by hand; here it is
 *   derived from the `diff` library's parts).
 *
 *   Three rules, each pinned in diff-rows.test.ts:
 *   - One gutter. A removed line keeps its old number, an added or unchanged
 *     line shows its new one, as in the source.
 *   - A trailing newline ends the last line; it is not an empty extra line.
 *   - Word-level pieces only where a removed run is followed by an added run of
 *     the SAME length, so line i of one really is the rewrite of line i of the
 *     other. A line with nothing left in common is shown whole, untinted: a
 *     fully rewritten line painted end to end says less than one left plain.
 */

export type DiffPart = { value: string; added?: boolean; removed?: boolean };
export type WordDiff = (before: string, after: string) => DiffPart[];

/** A run of text within a row. `changed` marks the words that differ. */
export type DiffPiece = { text: string; changed?: boolean };
export type DiffRow = {
  kind: 'context' | 'added' | 'removed';
  oldNo?: number;
  newNo?: number;
  pieces: DiffPiece[];
};
/** One line of the split layout. A side is absent where the other side has no partner. */
export type SplitRow = { left?: DiffRow; right?: DiffRow };

function linesOf(value: string): string[] {
  const lines = value.split('\n');
  return lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
}

function pieces(parts: DiffPart[], side: 'removed' | 'added'): DiffPiece[] | null {
  const common = parts.some((p) => !p.added && !p.removed && p.value.trim() !== '');
  if (!common) return null;
  const drop = side === 'removed' ? 'added' : 'removed';
  return parts.filter((p) => !p[drop]).map((p) => ({ text: p.value, changed: !!p[side] }));
}

/** Unified rows from a line diff. Pass `words` to get word-level pieces on rewrites. */
export function diffRows(parts: DiffPart[], words?: WordDiff): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldNo = 1;
  let newNo = 1;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const lines = linesOf(part.value);
    const next = parts[i + 1];
    if (part.removed && next?.added && words) {
      const added = linesOf(next.value);
      if (added.length === lines.length) {
        const removedRows: DiffRow[] = [];
        const addedRows: DiffRow[] = [];
        lines.forEach((text, j) => {
          const w = words(text, added[j]);
          removedRows.push({ kind: 'removed', oldNo: oldNo++, pieces: pieces(w, 'removed') ?? [{ text }] });
          addedRows.push({ kind: 'added', newNo: newNo++, pieces: pieces(w, 'added') ?? [{ text: added[j] }] });
        });
        rows.push(...removedRows, ...addedRows);
        i++;
        continue;
      }
    }
    for (const text of lines) {
      if (part.added) rows.push({ kind: 'added', newNo: newNo++, pieces: [{ text }] });
      else if (part.removed) rows.push({ kind: 'removed', oldNo: oldNo++, pieces: [{ text }] });
      else rows.push({ kind: 'context', oldNo: oldNo++, newNo: newNo++, pieces: [{ text }] });
    }
  }
  return rows;
}

/** Side-by-side pairing: a removed run sits beside the added run that replaced it. */
export function splitRows(rows: DiffRow[]): SplitRow[] {
  const out: SplitRow[] = [];
  let i = 0;
  while (i < rows.length) {
    if (rows[i].kind === 'context') {
      out.push({ left: rows[i], right: rows[i] });
      i++;
      continue;
    }
    const removed: DiffRow[] = [];
    const added: DiffRow[] = [];
    while (rows[i]?.kind === 'removed') removed.push(rows[i++]);
    while (rows[i]?.kind === 'added') added.push(rows[i++]);
    for (let j = 0; j < Math.max(removed.length, added.length); j++) {
      out.push({ left: removed[j], right: added[j] });
    }
  }
  return out;
}
