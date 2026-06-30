// @file editor/core/drag-reorder.test.ts
// @description Unit tests for the L1 drag-to-reorder drop resolution (editor
//   chrome PIECE 2). Pure logic over synthetic rects + a synthetic sibling
//   accessor — no DOM, no browser. Covers: correct after_id across 3 stacked
//   siblings for each draggable; no-op on self-drop and on a single child;
//   horizontal-row axis auto-detect; the emitted node_moved op shape; and an
//   end-to-end apply through spec-mutator to prove the op actually reorders.
// @created 2026-06-30 (editor chrome PIECE 2 — drag-to-reorder siblings)
import { describe, expect, it } from 'vitest';
import { BoundsIndex } from './bounds-index.js';
import type { Rect } from './geometry.js';
import {
  resolveSiblingDrop,
  siblingResolverFromRoot,
  nodeMovedOp,
  type SiblingResolver
} from './drag-reorder.js';
import { applyOp } from '../../core/spec-mutator.js';
import type { UINode } from '../../schema/ui-spec.js';

/** Rect at a vertical offset (column layout): fixed x, varying top. */
function vrect(top: number, height = 20, left = 0, width = 100): Rect {
  return { left, top, right: left + width, bottom: top + height, width, height };
}
/** Rect at a horizontal offset (row layout): fixed y, varying left. */
function hrect(left: number, width = 20, top = 0, height = 100): Rect {
  return { left, top, right: left + width, bottom: top + height, width, height };
}

// Three siblings stacked vertically: A[0..20] mid 10, B[30..50] mid 40, C[60..80] mid 70.
function colBounds(): BoundsIndex {
  return new BoundsIndex(
    new Map<string, Rect>([
      ['n_a', vrect(0)],
      ['n_b', vrect(30)],
      ['n_c', vrect(60)]
    ])
  );
}

const threeSiblings: SiblingResolver = () => ({
  parentId: 'n_root',
  siblingIds: ['n_a', 'n_b', 'n_c']
});

describe('resolveSiblingDrop — vertical stack of 3', () => {
  const bounds = colBounds();

  it('drag C above A -> insert first (after_id "")', () => {
    expect(resolveSiblingDrop(bounds, 'n_c', { x: 0, y: 5 }, threeSiblings)).toEqual({
      new_parent_id: 'n_root',
      after_id: ''
    });
  });

  it('drag C between A and B -> after A', () => {
    expect(resolveSiblingDrop(bounds, 'n_c', { x: 0, y: 15 }, threeSiblings)).toEqual({
      new_parent_id: 'n_root',
      after_id: 'n_a'
    });
  });

  it('drag A between B and C -> after B', () => {
    expect(resolveSiblingDrop(bounds, 'n_a', { x: 0, y: 50 }, threeSiblings)).toEqual({
      new_parent_id: 'n_root',
      after_id: 'n_b'
    });
  });

  it('drag A below C -> after C (last)', () => {
    expect(resolveSiblingDrop(bounds, 'n_a', { x: 0, y: 80 }, threeSiblings)).toEqual({
      new_parent_id: 'n_root',
      after_id: 'n_c'
    });
  });

  it('drag B before A -> after_id ""', () => {
    expect(resolveSiblingDrop(bounds, 'n_b', { x: 0, y: 5 }, threeSiblings)).toEqual({
      new_parent_id: 'n_root',
      after_id: ''
    });
  });
});

describe('resolveSiblingDrop — no-op cases', () => {
  const bounds = colBounds();

  it('dropping a node on its own slot is a no-op (null)', () => {
    // B sits at 30..50 (mid 40); a pointer over B resolves to "after A" == B's
    // current slot -> no move.
    expect(resolveSiblingDrop(bounds, 'n_b', { x: 0, y: 40 }, threeSiblings)).toBeNull();
  });

  it('dragging the first node to the top is a no-op', () => {
    expect(resolveSiblingDrop(bounds, 'n_a', { x: 0, y: 5 }, threeSiblings)).toBeNull();
  });

  it('dragging the last node below the last sibling is a no-op', () => {
    // C dropped below B resolves to "after B" == C's current slot.
    expect(resolveSiblingDrop(bounds, 'n_c', { x: 0, y: 45 }, threeSiblings)).toBeNull();
  });

  it('a single child has nothing to reorder against (null)', () => {
    const solo = new BoundsIndex(new Map<string, Rect>([['n_only', vrect(0)]]));
    const oneSibling: SiblingResolver = () => ({ parentId: 'n_root', siblingIds: ['n_only'] });
    expect(resolveSiblingDrop(solo, 'n_only', { x: 0, y: 5 }, oneSibling)).toBeNull();
  });

  it('returns null when the resolver cannot find the node', () => {
    expect(resolveSiblingDrop(bounds, 'n_ghost', { x: 0, y: 5 }, () => null)).toBeNull();
  });
});

describe('resolveSiblingDrop — horizontal row axis auto-detect', () => {
  // A[0..20] mid 10, B[30..50] mid 40, C[60..80] mid 70 along X.
  const row = new BoundsIndex(
    new Map<string, Rect>([
      ['n_a', hrect(0)],
      ['n_b', hrect(30)],
      ['n_c', hrect(60)]
    ])
  );

  it('uses the X axis when siblings spread horizontally', () => {
    expect(resolveSiblingDrop(row, 'n_c', { x: 5, y: 50 }, threeSiblings)).toEqual({
      new_parent_id: 'n_root',
      after_id: ''
    });
    expect(resolveSiblingDrop(row, 'n_c', { x: 25, y: 50 }, threeSiblings)).toEqual({
      new_parent_id: 'n_root',
      after_id: 'n_a'
    });
  });
});

describe('nodeMovedOp — wire shape', () => {
  it('builds the canonical node_moved payload', () => {
    expect(nodeMovedOp('n_c', { new_parent_id: 'n_root', after_id: 'n_a' })).toEqual({
      action: 'node_moved',
      node_id: 'n_c',
      new_parent_id: 'n_root',
      after_id: 'n_a'
    });
  });
});

describe('siblingResolverFromRoot + end-to-end apply', () => {
  function tree(): UINode {
    return {
      type: 'container',
      id: 'n_root',
      children: [
        { type: 'text', id: 'n_a', props: { text: 'A' } },
        { type: 'text', id: 'n_b', props: { text: 'B' } },
        { type: 'text', id: 'n_c', props: { text: 'C' } }
      ]
    } as UINode;
  }

  it('resolves a node to its parent + ordered siblings', () => {
    const root = tree();
    const resolve = siblingResolverFromRoot(() => root);
    expect(resolve('n_b')).toEqual({ parentId: 'n_root', siblingIds: ['n_a', 'n_b', 'n_c'] });
  });

  it('returns null for the root (no parent) and unknown ids', () => {
    const root = tree();
    const resolve = siblingResolverFromRoot(() => root);
    expect(resolve('n_root')).toBeNull();
    expect(resolve('n_missing')).toBeNull();
  });

  it('the resolved op actually reorders the tree (C -> first)', () => {
    const root = tree();
    const resolve = siblingResolverFromRoot(() => root);
    const target = resolveSiblingDrop(colBounds(), 'n_c', { x: 0, y: 5 }, resolve);
    expect(target).toEqual({ new_parent_id: 'n_root', after_id: '' });

    const ok = applyOp(root, nodeMovedOp('n_c', target!));
    expect(ok).toBe(true);
    expect(root.children!.map((c) => c.id)).toEqual(['n_c', 'n_a', 'n_b']);
  });

  it('the resolved op moves A to after B', () => {
    const root = tree();
    const resolve = siblingResolverFromRoot(() => root);
    const target = resolveSiblingDrop(colBounds(), 'n_a', { x: 0, y: 50 }, resolve);
    expect(target).toEqual({ new_parent_id: 'n_root', after_id: 'n_b' });

    applyOp(root, nodeMovedOp('n_a', target!));
    expect(root.children!.map((c) => c.id)).toEqual(['n_b', 'n_a', 'n_c']);
  });
});
