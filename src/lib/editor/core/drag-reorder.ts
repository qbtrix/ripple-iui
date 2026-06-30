/**
 * @file editor/core/drag-reorder.ts
 * @description L1 (PURE TS, zero Svelte/rune imports) drop-resolution for the
 *   visual editor's drag-to-reorder (editor chrome PIECE 2). Given the overlay's
 *   `BoundsIndex` (id -> container-relative Rect), a dragged node id, and a
 *   container-relative pointer, it resolves WHICH SIBLING GAP the pointer is over
 *   and returns the `node_moved` operands `{ new_parent_id, after_id }` (or null
 *   for a no-op). Pure math + tree lookup, so it is unit-testable over synthetic
 *   rects and a synthetic sibling accessor — no DOM, no browser.
 *
 *   SCOPE v1: SAME-PARENT reorder only. Siblings come from `resolveSiblings`,
 *   which returns the dragged node's OWN parent, so `new_parent_id` is always the
 *   current parent. Cross-parent drag (re-homing into a different container) is a
 *   deliberate FOLLOW-UP — it needs a parent-hit-test the resolver doesn't do yet.
 *
 *   `after_id` is the sibling to insert AFTER (matching `spec-mutator`'s
 *   `applyMoveNode`), or `''` to insert FIRST. It is always one of the OTHER
 *   siblings (never the dragged node, which `applyMoveNode` removes before
 *   re-inserting). The drop axis (row vs column) is auto-detected from the spread
 *   of the sibling centers, so a vertical stack and a horizontal row both work.
 * @created 2026-06-30 (editor chrome PIECE 2 — drag-to-reorder siblings)
 */
import type { UINode } from '../../schema/ui-spec.js';
import { findParent } from '../../core/spec-mutator.js';
import type { EditorOp } from './editor-ops.js';
import type { BoundsIndex } from './bounds-index.js';

/** The dragged node's parent id + its sibling ids in document order (incl. self). */
export interface ParentAndSiblings {
  parentId: string;
  /** Sibling ids in document order, INCLUDING the dragged node itself. */
  siblingIds: string[];
}

/** Resolve a node id to its parent + ordered siblings (or null if not found). */
export type SiblingResolver = (id: string) => ParentAndSiblings | null;

/** The `node_moved` operands a resolved drop produces. */
export interface DropTarget {
  new_parent_id: string;
  /** Sibling id to insert AFTER, or '' to insert first. */
  after_id: string;
}

/** Build a `SiblingResolver` from a live root accessor (uses `findParent`). */
export function siblingResolverFromRoot(
  getRoot: () => UINode | null | undefined
): SiblingResolver {
  return (id) => {
    const root = getRoot();
    if (!root) return null;
    const loc = findParent(root, id);
    if (!loc || !loc.parent.id) return null;
    const kids = (loc.parent[loc.key] ?? []) as UINode[];
    const siblingIds = kids.map((k) => k?.id).filter((x): x is string => !!x);
    return { parentId: loc.parent.id, siblingIds };
  };
}

/**
 * Resolve a drag drop to `{ new_parent_id, after_id }`, or null for a no-op
 * (pointer resolves to the dragged node's current slot — which includes dropping
 * it on itself — or there is nothing to reorder against).
 */
export function resolveSiblingDrop(
  bounds: BoundsIndex,
  draggedId: string,
  pointer: { x: number; y: number },
  resolveSiblings: SiblingResolver
): DropTarget | null {
  const ps = resolveSiblings(draggedId);
  if (!ps || !ps.parentId) return null;

  const { parentId, siblingIds } = ps;
  const d = siblingIds.indexOf(draggedId);
  if (d === -1) return null;
  // The dragged node's CURRENT preceding sibling — the after_id that reproduces
  // its present position. Resolving back to this is the no-op case.
  const currentAfter = d <= 0 ? '' : siblingIds[d - 1];

  // Candidates to place against: every OTHER sibling that has a measured rect.
  // (after_id is always one of these — the dragged node is removed before the
  // re-insert — or '' for first.)
  const others = siblingIds.filter((id) => id !== draggedId && !!bounds.get(id));
  if (others.length === 0) return null;

  const cells = others.map((id) => {
    const r = bounds.get(id)!;
    return { id, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });

  // Auto-detect the layout axis from the spread of sibling centers so a column
  // (vary in y) and a row (vary in x) both resolve correctly.
  const xs = cells.map((c) => c.cx);
  const ys = cells.map((c) => c.cy);
  const horizontal = Math.max(...xs) - Math.min(...xs) > Math.max(...ys) - Math.min(...ys);
  const coord = horizontal ? pointer.x : pointer.y;
  const centerOf = (c: { cx: number; cy: number }) => (horizontal ? c.cx : c.cy);

  // Insertion index = number of sibling centers the pointer is past along the
  // axis. after_id is the sibling just before that gap ('' when before the first).
  let k = cells.findIndex((c) => coord < centerOf(c));
  if (k === -1) k = cells.length;
  const afterId = k === 0 ? '' : cells[k - 1].id;

  if (afterId === currentAfter) return null; // no move (covers self-drop)

  return { new_parent_id: parentId, after_id: afterId };
}

/** Build the wire-shaped `node_moved` op from a resolved drop target. */
export function nodeMovedOp(node_id: string, target: DropTarget): EditorOp {
  return {
    action: 'node_moved',
    node_id,
    new_parent_id: target.new_parent_id,
    after_id: target.after_id
  };
}
