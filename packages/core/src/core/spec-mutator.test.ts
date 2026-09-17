import { describe, expect, test } from 'vitest';
import {
  applyAppendPropArrayItem,
  applyMoveNode,
  applyOp,
  applyRemovePropArrayItem,
  applySetPropArrayItem,
} from './spec-mutator.js';
import type { UINode } from '../schema/ui-spec.js';

// Helpers ------------------------------------------------------------------

function chart(data: unknown[]): UINode {
  return {
    id: 'chart-1',
    type: 'chart',
    props: { data },
  } as UINode;
}

function root(child: UINode): UINode {
  return {
    id: 'root',
    type: 'container',
    children: [child],
  } as UINode;
}

// applySetPropArrayItem ----------------------------------------------------

describe('applySetPropArrayItem', () => {
  test('shallow-merges dict items and returns the prior value', () => {
    const tree = root(chart([{ x: 1, y: 2 }, { x: 3, y: 4 }]));
    const old = applySetPropArrayItem(tree, {
      node_id: 'chart-1',
      prop: 'data',
      item_index: 1,
      item: { y: 99 },
    });
    expect(old).toEqual({ x: 3, y: 4 });
    const arr = (tree.children![0].props as { data: unknown[] }).data;
    expect(arr[1]).toEqual({ x: 3, y: 99 });
  });

  test('replaces non-dict items wholesale', () => {
    const tree = root(chart([10, 20, 30]));
    applySetPropArrayItem(tree, {
      node_id: 'chart-1',
      prop: 'data',
      item_index: 0,
      item: 42,
    });
    expect((tree.children![0].props as { data: unknown[] }).data).toEqual([42, 20, 30]);
  });

  test('throws on out-of-range index', () => {
    const tree = root(chart([1, 2]));
    expect(() =>
      applySetPropArrayItem(tree, { node_id: 'chart-1', prop: 'data', item_index: 5, item: 9 }),
    ).toThrow(/out of range/);
    expect(() =>
      applySetPropArrayItem(tree, { node_id: 'chart-1', prop: 'data', item_index: -1, item: 9 }),
    ).toThrow(/out of range/);
  });

  test('throws when the prop is not an array', () => {
    const tree = root({ id: 'chart-1', type: 'chart', props: { data: 'oops' } } as UINode);
    expect(() =>
      applySetPropArrayItem(tree, { node_id: 'chart-1', prop: 'data', item_index: 0, item: 1 }),
    ).toThrow(/not an array/);
  });

  test('throws when the node is missing', () => {
    const tree = root(chart([]));
    expect(() =>
      applySetPropArrayItem(tree, { node_id: 'ghost', prop: 'data', item_index: 0, item: 1 }),
    ).toThrow(/no node with id ghost/);
  });
});

// applyAppendPropArrayItem -------------------------------------------------

describe('applyAppendPropArrayItem', () => {
  test('inserts at the given index', () => {
    const tree = root(chart([1, 3]));
    applyAppendPropArrayItem(tree, {
      node_id: 'chart-1',
      prop: 'data',
      item_index: 1,
      item: 2,
    });
    expect((tree.children![0].props as { data: unknown[] }).data).toEqual([1, 2, 3]);
  });

  test('allows appending at the end (item_index === arr.length)', () => {
    const tree = root(chart([1, 2]));
    applyAppendPropArrayItem(tree, {
      node_id: 'chart-1',
      prop: 'data',
      item_index: 2,
      item: 3,
    });
    expect((tree.children![0].props as { data: unknown[] }).data).toEqual([1, 2, 3]);
  });

  test('auto-initialises a missing prop to []', () => {
    const tree = root({ id: 'chart-1', type: 'chart', props: {} } as UINode);
    applyAppendPropArrayItem(tree, {
      node_id: 'chart-1',
      prop: 'data',
      item_index: 0,
      item: 'first',
    });
    expect((tree.children![0].props as { data: unknown[] }).data).toEqual(['first']);
  });

  test('refuses to clobber a non-array existing value', () => {
    const tree = root({ id: 'chart-1', type: 'chart', props: { data: 'not-an-array' } } as UINode);
    expect(() =>
      applyAppendPropArrayItem(tree, {
        node_id: 'chart-1',
        prop: 'data',
        item_index: 0,
        item: 'x',
      }),
    ).toThrow(/not an array/);
    // Original value preserved.
    expect((tree.children![0].props as { data: unknown }).data).toBe('not-an-array');
  });

  test('throws on out-of-range index', () => {
    const tree = root(chart([1, 2]));
    expect(() =>
      applyAppendPropArrayItem(tree, {
        node_id: 'chart-1',
        prop: 'data',
        item_index: 5,
        item: 9,
      }),
    ).toThrow(/out of range/);
    expect(() =>
      applyAppendPropArrayItem(tree, {
        node_id: 'chart-1',
        prop: 'data',
        item_index: -1,
        item: 9,
      }),
    ).toThrow(/out of range/);
  });
});

// applyRemovePropArrayItem -------------------------------------------------

describe('applyRemovePropArrayItem', () => {
  test('splices and returns the removed item', () => {
    const tree = root(chart(['a', 'b', 'c']));
    const removed = applyRemovePropArrayItem(tree, {
      node_id: 'chart-1',
      prop: 'data',
      removed_index: 1,
    });
    expect(removed).toBe('b');
    expect((tree.children![0].props as { data: unknown[] }).data).toEqual(['a', 'c']);
  });

  test('throws on out-of-range index', () => {
    const tree = root(chart([1]));
    expect(() =>
      applyRemovePropArrayItem(tree, { node_id: 'chart-1', prop: 'data', removed_index: 5 }),
    ).toThrow(/out of range/);
  });
});

// Dispatch via applyOp -----------------------------------------------------

describe('applyOp — prop-array item dispatch', () => {
  test('routes node_prop_array_item_set', () => {
    const tree = root(chart([{ label: 'old' }]));
    const ok = applyOp(tree, {
      action: 'node_prop_array_item_set',
      node_id: 'chart-1',
      prop: 'data',
      item_index: 0,
      item: { label: 'new' },
    });
    expect(ok).toBe(true);
    expect((tree.children![0].props as { data: unknown[] }).data[0]).toEqual({ label: 'new' });
  });

  test('routes node_prop_array_item_appended', () => {
    const tree = root(chart([1, 2]));
    const ok = applyOp(tree, {
      action: 'node_prop_array_item_appended',
      node_id: 'chart-1',
      prop: 'data',
      item_index: 2,
      item: 3,
    });
    expect(ok).toBe(true);
    expect((tree.children![0].props as { data: unknown[] }).data).toEqual([1, 2, 3]);
  });

  test('routes node_prop_array_item_removed', () => {
    const tree = root(chart([1, 2, 3]));
    const ok = applyOp(tree, {
      action: 'node_prop_array_item_removed',
      node_id: 'chart-1',
      prop: 'data',
      removed_index: 0,
    });
    expect(ok).toBe(true);
    expect((tree.children![0].props as { data: unknown[] }).data).toEqual([2, 3]);
  });
});

// applyMoveNode ------------------------------------------------------------
// node_moved's first consumer is the editor's drag-to-reorder; these lock its
// after_id contract (empty = insert FIRST, which differs from node_added).

describe('applyMoveNode', () => {
  function row(): UINode {
    return {
      id: 'n_root',
      type: 'container',
      children: [
        { id: 'n_a', type: 'text' },
        { id: 'n_b', type: 'text' },
        { id: 'n_c', type: 'text' },
      ],
    } as UINode;
  }
  const ids = (t: UINode) => t.children!.map((c) => c.id);

  test('empty after_id inserts FIRST (reorder-to-top contract)', () => {
    const tree = row();
    applyMoveNode(tree, { node_id: 'n_c', new_parent_id: 'n_root', after_id: '' });
    expect(ids(tree)).toEqual(['n_c', 'n_a', 'n_b']);
  });

  test('omitted after_id also inserts first', () => {
    const tree = row();
    applyMoveNode(tree, { node_id: 'n_c', new_parent_id: 'n_root' });
    expect(ids(tree)).toEqual(['n_c', 'n_a', 'n_b']);
  });

  test('after_id inserts directly after the named sibling', () => {
    const tree = row();
    applyMoveNode(tree, { node_id: 'n_a', new_parent_id: 'n_root', after_id: 'n_b' });
    expect(ids(tree)).toEqual(['n_b', 'n_a', 'n_c']);
  });

  test('moving after the last sibling lands at the end', () => {
    const tree = row();
    applyMoveNode(tree, { node_id: 'n_a', new_parent_id: 'n_root', after_id: 'n_c' });
    expect(ids(tree)).toEqual(['n_b', 'n_c', 'n_a']);
  });

  test('routes through applyOp by action name', () => {
    const tree = row();
    const ok = applyOp(tree, {
      action: 'node_moved',
      node_id: 'n_b',
      new_parent_id: 'n_root',
      after_id: '',
    });
    expect(ok).toBe(true);
    expect(ids(tree)).toEqual(['n_b', 'n_a', 'n_c']);
  });

  test('throws on an unknown after_id and leaves the tree intact', () => {
    const tree = row();
    expect(() =>
      applyMoveNode(tree, { node_id: 'n_a', new_parent_id: 'n_root', after_id: 'n_ghost' }),
    ).toThrow();
    expect(ids(tree)).toEqual(['n_a', 'n_b', 'n_c']);
  });

  test('refuses to move a node into its own descendant', () => {
    const tree = {
      id: 'n_root',
      type: 'container',
      children: [
        { id: 'n_box', type: 'container', children: [{ id: 'n_inner', type: 'text' }] },
        { id: 'n_sib', type: 'text' },
      ],
    } as UINode;
    expect(() =>
      applyMoveNode(tree, { node_id: 'n_box', new_parent_id: 'n_inner', after_id: '' }),
    ).toThrow();
  });
});
