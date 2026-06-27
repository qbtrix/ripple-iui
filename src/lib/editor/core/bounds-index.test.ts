// editor/core/bounds-index.test.ts
// @description SP-1a unit tests for the L1 DOM-id addressability core. Covers the
//   PURE, layout-free logic with synthetic rects + synthetic jsdom elements:
//     - nodeIdOf: data-ripple-node wins over id; recognizer gates plain ids.
//     - resolveElementToNodeId: direct hit, SELECT-PARENT ancestor walk,
//       data-ripple-node ancestor, boundary stop (exclusive), unrecognized-id
//       skip, null target.
//     - BoundsIndex.resolvePoint: single hit, innermost (smallest-area) on nested
//       overlap, miss; plus get/has/ids/size.
//     - buildBoundsIndex: which node ids it finds (jsdom returns ZERO rects, so
//       pixel positions are NOT asserted — deferred to browser), document-order
//       dedup for the motion wrapper+widget that repeat one id, and knownIds
//       precision (a ripple-format id NOT in knownIds is excluded).
// @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
import { describe, expect, it } from 'vitest';
import {
  BoundsIndex,
  buildBoundsIndex,
  findNodeElement,
  nodeIdOf,
  resolveElementToNodeId,
  RIPPLE_NODE_ATTR
} from './bounds-index.js';
import type { Rect } from './geometry.js';

function rect(left: number, top: number, width: number, height: number): Rect {
  return { left, top, right: left + width, bottom: top + height, width, height };
}

function makeEl(attrs: Record<string, string> = {}, tag = 'div'): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

describe('nodeIdOf', () => {
  it('returns the data-ripple-node value, which wins over id', () => {
    const el = makeEl({ id: 'n_iddddddd', [RIPPLE_NODE_ATTR]: 'n_stampaaa' });
    expect(nodeIdOf(el)).toBe('n_stampaaa');
  });

  it('returns a recognized id (ripple format) when no stamp is present', () => {
    expect(nodeIdOf(makeEl({ id: 'n_aaaaaaaa' }))).toBe('n_aaaaaaaa');
  });

  it('returns null for an unrecognized plain id (default recognizer)', () => {
    expect(nodeIdOf(makeEl({ id: 'author-thing' }))).toBeNull();
  });

  it('accepts a plain id when knownIds lists it', () => {
    expect(nodeIdOf(makeEl({ id: 'author-thing' }), { knownIds: new Set(['author-thing']) })).toBe(
      'author-thing'
    );
  });

  it('returns null when nothing is carried', () => {
    expect(nodeIdOf(makeEl())).toBeNull();
  });
});

describe('resolveElementToNodeId (SELECT-PARENT walk)', () => {
  // container > parent#n_parent01 > child > leaf
  function chain() {
    const container = makeEl();
    const parent = makeEl({ id: 'n_parent01' });
    const child = makeEl();
    const leaf = makeEl({}, 'span');
    container.appendChild(parent);
    parent.appendChild(child);
    child.appendChild(leaf);
    return { container, parent, child, leaf };
  }

  it('resolves a direct hit', () => {
    const { parent, container } = chain();
    expect(resolveElementToNodeId(parent, { boundary: container })).toBe('n_parent01');
  });

  it('walks up to the nearest id-bearing ancestor (the non-forwarder case)', () => {
    const { leaf, container } = chain();
    expect(resolveElementToNodeId(leaf, { boundary: container })).toBe('n_parent01');
  });

  it('resolves through a data-ripple-node wrapper (motion-wrapped node)', () => {
    const container = makeEl();
    const wrapper = makeEl({ [RIPPLE_NODE_ATTR]: 'n_motion01' });
    const inner = makeEl();
    container.appendChild(wrapper);
    wrapper.appendChild(inner);
    expect(resolveElementToNodeId(inner, { boundary: container })).toBe('n_motion01');
  });

  it('stops at the boundary (exclusive) and returns null', () => {
    const { parent, child } = chain();
    // boundary === parent, so the only id (on parent) is never inspected.
    expect(resolveElementToNodeId(child, { boundary: parent })).toBeNull();
  });

  it('skips unrecognized ancestor ids and keeps walking', () => {
    const container = makeEl();
    const junk = makeEl({ id: 'author-thing' }); // not a node id by default
    const target = makeEl();
    container.appendChild(junk);
    junk.appendChild(target);
    expect(resolveElementToNodeId(target, { boundary: container })).toBeNull();
  });

  it('returns null for a null target', () => {
    expect(resolveElementToNodeId(null)).toBeNull();
  });
});

describe('BoundsIndex.resolvePoint', () => {
  it('returns the id of the single rect that contains the point', () => {
    const idx = new BoundsIndex(new Map([['n_aaaaaaaa', rect(0, 0, 100, 100)]]));
    expect(idx.resolvePoint(50, 50)).toBe('n_aaaaaaaa');
    expect(idx.resolvePoint(200, 200)).toBeNull();
  });

  it('returns the innermost (smallest-area) rect on nested overlap', () => {
    const idx = new BoundsIndex(
      new Map([
        ['n_outer001', rect(0, 0, 200, 200)],
        ['n_inner001', rect(40, 40, 40, 40)] // fully inside outer
      ])
    );
    // a point inside both -> inner wins
    expect(idx.resolvePoint(50, 50)).toBe('n_inner001');
    // a point only inside outer -> outer
    expect(idx.resolvePoint(150, 150)).toBe('n_outer001');
  });

  it('exposes get/has/ids/size', () => {
    const idx = new BoundsIndex(new Map([['n_aaaaaaaa', rect(1, 2, 3, 4)]]));
    expect(idx.size).toBe(1);
    expect(idx.has('n_aaaaaaaa')).toBe(true);
    expect(idx.has('n_missing0')).toBe(false);
    expect(idx.get('n_aaaaaaaa')).toEqual(rect(1, 2, 3, 4));
    expect(idx.ids()).toEqual(['n_aaaaaaaa']);
  });
});

describe('buildBoundsIndex (id discovery; positions deferred to browser)', () => {
  it('indexes every recognized node id under the container', () => {
    const container = makeEl();
    container.appendChild(makeEl({ id: 'n_aaaaaaaa' }));
    container.appendChild(makeEl({ id: 'n_bbbbbbbb' }));
    container.appendChild(makeEl({ [RIPPLE_NODE_ATTR]: 'n_cccccccc' }));
    const idx = buildBoundsIndex(container);
    expect(idx.ids().sort()).toEqual(['n_aaaaaaaa', 'n_bbbbbbbb', 'n_cccccccc']);
  });

  it('dedupes a motion wrapper + inner widget that repeat one id (document order)', () => {
    const container = makeEl();
    const wrapper = makeEl({ [RIPPLE_NODE_ATTR]: 'n_dup00001' });
    const inner = makeEl({ id: 'n_dup00001' }); // same node id on the widget root
    wrapper.appendChild(inner);
    container.appendChild(wrapper);
    const idx = buildBoundsIndex(container);
    expect(idx.size).toBe(1);
    expect(idx.ids()).toEqual(['n_dup00001']);
  });

  it('honors knownIds precision (ripple-format id not in the set is excluded)', () => {
    const container = makeEl();
    container.appendChild(makeEl({ id: 'n_aaaaaaaa' }));
    container.appendChild(makeEl({ id: 'n_zzzzzzzz' })); // valid format, NOT known
    const idx = buildBoundsIndex(container, { knownIds: new Set(['n_aaaaaaaa']) });
    expect(idx.ids()).toEqual(['n_aaaaaaaa']);
  });

  it('ignores non-node ids entirely', () => {
    const container = makeEl();
    container.appendChild(makeEl({ id: 'author-thing' }));
    const idx = buildBoundsIndex(container);
    expect(idx.size).toBe(0);
  });
});

describe('findNodeElement (SP-1b: the element the inline editor edits)', () => {
  it('finds the element carrying a node id (by DOM id)', () => {
    const container = makeEl();
    const heading = makeEl({ id: 'n_head0001' }, 'h2');
    container.appendChild(heading);
    expect(findNodeElement(container, 'n_head0001')).toBe(heading);
  });

  it('finds the element carrying a node id via the data-ripple-node stamp', () => {
    const container = makeEl();
    const wrap = makeEl({ [RIPPLE_NODE_ATTR]: 'n_motion01' });
    container.appendChild(wrap);
    expect(findNodeElement(container, 'n_motion01')).toBe(wrap);
  });

  it('returns the FIRST match (outermost) when an id repeats', () => {
    const container = makeEl();
    const outer = makeEl({ [RIPPLE_NODE_ATTR]: 'n_dup00001' });
    const inner = makeEl({ id: 'n_dup00001' });
    outer.appendChild(inner);
    container.appendChild(outer);
    expect(findNodeElement(container, 'n_dup00001')).toBe(outer);
  });

  it('returns null when no element carries the id (e.g. a non-id-forwarding widget)', () => {
    const container = makeEl();
    container.appendChild(makeEl({ id: 'n_other001' }));
    expect(findNodeElement(container, 'n_missing0')).toBeNull();
  });
});
