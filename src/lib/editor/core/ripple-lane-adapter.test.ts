// editor/core/ripple-lane-adapter.test.ts
// @description EP-1 unit tests for the ripple implementation of the LaneAdapter
//   port. Over a synthetic spec tree (real widget types so the manifest yields
//   fields) it proves: readNode normalizes a node (uid/type/props copy/childUids/
//   text); listChildren returns child refs in order; getFields == inferFields;
//   resolveElement maps a DOM element -> TargetRef; and applyEdit maps every EditOp
//   to spec-mutator — setProp (with manifest coercion), setText, moveChild,
//   removeChild round-trip the root, return true, and fire onApplied; a bad ref is
//   swallowed to `false` (the port never throws).
// @created 2026-06-30 (EP-1 — LaneAdapter port + Ripple adapter)
import { describe, it, expect, vi } from 'vitest';
import type { UINode } from '../../schema/ui-spec.js';
import { findById } from '../../core/spec-mutator.js';
import { inferFields } from './inspector-fields.js';
import { RippleLaneAdapter } from './ripple-lane-adapter.js';

// heading carries text (string) + level ('1|2|...|6' → numeric select); the tree
// is a container of three leaves so child-order ops are observable.
const tree = (): UINode => ({
  type: 'container',
  id: 'n_root0001',
  props: { padding: 'lg' },
  children: [
    { type: 'heading', id: 'n_head0001', props: { text: 'Title', level: 2 } },
    { type: 'text', id: 'n_text0001', props: { text: 'Body' } },
    { type: 'button', id: 'n_btn00001', props: { label: 'Go' } }
  ]
});

const ref = (uid: string) => ({ uid, lane: 'ripple' });
const childIds = (root: UINode, id: string) =>
  findById(root, id)?.children?.map((c) => c?.id) ?? [];

describe('RippleLaneAdapter — identity', () => {
  it('reports id="ripple" and inlineEditor="tiptap"', () => {
    const a = new RippleLaneAdapter({ getRoot: () => tree() });
    expect(a.id).toBe('ripple');
    expect(a.inlineEditor).toBe('tiptap');
  });
});

describe('RippleLaneAdapter.readNode', () => {
  it('normalizes a node — uid, type, props copy, childUids, primary text', () => {
    const root = tree();
    const a = new RippleLaneAdapter({ getRoot: () => root });

    const n = a.readNode(ref('n_head0001'));
    expect(n).toMatchObject({ uid: 'n_head0001', type: 'heading', childUids: [], text: 'Title' });
    expect(n?.props).toEqual({ text: 'Title', level: 2 });

    const c = a.readNode(ref('n_root0001'));
    expect(c?.childUids).toEqual(['n_head0001', 'n_text0001', 'n_btn00001']);
    expect(c?.text).toBeUndefined(); // container has no primary text prop
  });

  it('returns a props COPY — mutating it never touches the live root', () => {
    const root = tree();
    const a = new RippleLaneAdapter({ getRoot: () => root });
    const n = a.readNode(ref('n_head0001'))!;
    n.props.text = 'tampered';
    expect(findById(root, 'n_head0001')?.props?.text).toBe('Title');
  });

  it('returns null for an unknown uid', () => {
    const a = new RippleLaneAdapter({ getRoot: () => tree() });
    expect(a.readNode(ref('n_missing0'))).toBeNull();
  });
});

describe('RippleLaneAdapter.listChildren', () => {
  it('returns child refs in document order', () => {
    const a = new RippleLaneAdapter({ getRoot: () => tree() });
    expect(a.listChildren(ref('n_root0001'))).toEqual([
      { uid: 'n_head0001', lane: 'ripple' },
      { uid: 'n_text0001', lane: 'ripple' },
      { uid: 'n_btn00001', lane: 'ripple' }
    ]);
  });

  it('returns [] for a leaf', () => {
    const a = new RippleLaneAdapter({ getRoot: () => tree() });
    expect(a.listChildren(ref('n_head0001'))).toEqual([]);
  });
});

describe('RippleLaneAdapter.getFields', () => {
  it('equals inferFields over the same node (it reuses the L1)', () => {
    const root = tree();
    const a = new RippleLaneAdapter({ getRoot: () => root });
    expect(a.getFields(ref('n_head0001'))).toEqual(inferFields(findById(root, 'n_head0001')));
  });
});

describe('RippleLaneAdapter.resolveElement', () => {
  it('maps an id-bearing element to a ripple TargetRef and unknowns to null', () => {
    const stage = document.createElement('div');
    stage.innerHTML = '<h2 id="n_head0001">Title</h2>';
    const a = new RippleLaneAdapter({
      getRoot: () => tree(),
      knownIds: new Set(['n_head0001']),
      getBoundary: () => stage
    });
    expect(a.resolveElement(stage.querySelector('#n_head0001')!)).toEqual({
      uid: 'n_head0001',
      lane: 'ripple'
    });
    expect(a.resolveElement(document.createElement('span'))).toBeNull();
  });
});

describe('RippleLaneAdapter.applyEdit — setProp', () => {
  it('writes a string prop, returns true, fires onApplied with the wire op', () => {
    const root = tree();
    const onApplied = vi.fn();
    const a = new RippleLaneAdapter({ getRoot: () => root, onApplied });

    const ok = a.applyEdit(ref('n_head0001'), { kind: 'setProp', name: 'text', value: 'New' });

    expect(ok).toBe(true);
    expect(findById(root, 'n_head0001')?.props?.text).toBe('New');
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(onApplied).toHaveBeenCalledWith({
      action: 'node_prop_set',
      node_id: 'n_head0001',
      prop: 'text',
      value: 'New'
    });
  });

  it('COERCES a raw control value to the prop model type (numeric select)', () => {
    const root = tree();
    const a = new RippleLaneAdapter({ getRoot: () => root });

    // level is a numeric-literal union → the inspector hands the raw string "4".
    const ok = a.applyEdit(ref('n_head0001'), { kind: 'setProp', name: 'level', value: '4' });

    expect(ok).toBe(true);
    const stored = findById(root, 'n_head0001')?.props?.level;
    expect(stored).toBe(4);
    expect(typeof stored).toBe('number'); // coerced, not the raw "4"
  });
});

describe('RippleLaneAdapter.applyEdit — setText', () => {
  it('writes the primary text prop of the target', () => {
    const root = tree();
    const a = new RippleLaneAdapter({ getRoot: () => root });
    expect(a.applyEdit(ref('n_head0001'), { kind: 'setText', html: 'Hello' })).toBe(true);
    expect(findById(root, 'n_head0001')?.props?.text).toBe('Hello');
  });

  it('writes the html prop for a rich-text widget', () => {
    const root: UINode = {
      type: 'container',
      id: 'n_root0001',
      children: [{ type: 'richtext', id: 'n_prose001', props: { html: '<p>a</p>' } }]
    };
    const a = new RippleLaneAdapter({ getRoot: () => root });
    expect(a.applyEdit(ref('n_prose001'), { kind: 'setText', html: '<p>b</p>' })).toBe(true);
    expect(findById(root, 'n_prose001')?.props?.html).toBe('<p>b</p>');
  });
});

describe('RippleLaneAdapter.applyEdit — moveChild', () => {
  it('reorders a child to the front (after_id ""), returns true, fires onApplied', () => {
    const root = tree();
    const onApplied = vi.fn();
    const a = new RippleLaneAdapter({ getRoot: () => root, onApplied });

    const ok = a.applyEdit(ref('n_root0001'), { kind: 'moveChild', childUid: 'n_btn00001', toIndex: 0 });

    expect(ok).toBe(true);
    expect(childIds(root, 'n_root0001')).toEqual(['n_btn00001', 'n_head0001', 'n_text0001']);
    expect(onApplied).toHaveBeenCalledWith({
      action: 'node_moved',
      node_id: 'n_btn00001',
      new_parent_id: 'n_root0001',
      after_id: ''
    });
  });

  it('reorders a child to a middle index (after_id = preceding sibling)', () => {
    const root = tree();
    const a = new RippleLaneAdapter({ getRoot: () => root });
    // [head, text, btn] → move head to index 1 → [text, head, btn]
    expect(a.applyEdit(ref('n_root0001'), { kind: 'moveChild', childUid: 'n_head0001', toIndex: 1 })).toBe(true);
    expect(childIds(root, 'n_root0001')).toEqual(['n_text0001', 'n_head0001', 'n_btn00001']);
  });
});

describe('RippleLaneAdapter.applyEdit — removeChild & insertChild', () => {
  it('removes a child and fires the node_removed op', () => {
    const root = tree();
    const onApplied = vi.fn();
    const a = new RippleLaneAdapter({ getRoot: () => root, onApplied });

    expect(a.applyEdit(ref('n_root0001'), { kind: 'removeChild', childUid: 'n_text0001' })).toBe(true);
    expect(childIds(root, 'n_root0001')).toEqual(['n_head0001', 'n_btn00001']);
    expect(onApplied).toHaveBeenCalledWith({ action: 'node_removed', node_id: 'n_text0001' });
  });

  it('inserts a new child after the preceding sibling (auto-assigned id)', () => {
    const root = tree();
    const a = new RippleLaneAdapter({ getRoot: () => root });
    // index 1 → after the child at index 0 (head)
    expect(a.applyEdit(ref('n_root0001'), { kind: 'insertChild', childType: 'badge', index: 1 })).toBe(true);
    const kids = findById(root, 'n_root0001')?.children ?? [];
    expect(kids.map((c) => c.type)).toEqual(['heading', 'badge', 'text', 'button']);
    expect(kids[1]?.id).toBeTruthy(); // applyAddNode minted an id
  });
});

describe('RippleLaneAdapter.applyEdit — failure path', () => {
  it('returns false (never throws) and skips onApplied on an illegal op', () => {
    const root = tree();
    const onApplied = vi.fn();
    const a = new RippleLaneAdapter({ getRoot: () => root, onApplied });

    // moving a non-existent child makes applyMoveNode throw; the adapter swallows.
    expect(a.applyEdit(ref('n_root0001'), { kind: 'moveChild', childUid: 'n_nope', toIndex: 0 })).toBe(false);
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('is a no-op (false) when the root accessor returns null', () => {
    const a = new RippleLaneAdapter({ getRoot: () => null });
    expect(a.applyEdit(ref('n_head0001'), { kind: 'setProp', name: 'text', value: 'x' })).toBe(false);
    expect(a.readNode(ref('n_head0001'))).toBeNull();
    expect(a.listChildren(ref('n_head0001'))).toEqual([]);
    expect(a.getFields(ref('n_head0001'))).toEqual([]);
  });
});
