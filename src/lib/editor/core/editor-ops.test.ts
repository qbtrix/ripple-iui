// editor/core/editor-ops.test.ts
// @description SP-1b unit tests for the L1 one-op apply seam. Proves the single
//   choke point both editor entry points share: setNodeProp builds a wire-shaped
//   node_prop_set and routes it through spec-mutator's applyOp against the host's
//   live root; onApplied fires after a successful op (the SP-1c persistence
//   interception point); unknown actions return false without firing onApplied;
//   a null root is a no-op; and errors route to onError (or rethrow).
// @created 2026-06-27 (SP-1b — branch spike/editor-domid-overlay)
import { describe, expect, it, vi } from 'vitest';
import type { UINode } from '../../schema/ui-spec.js';
import { findById } from '../../core/spec-mutator.js';
import { createEditorOps, nodePropSet } from './editor-ops.js';

const tree = (): UINode => ({
  type: 'container',
  id: 'n_root0001',
  children: [{ type: 'text', id: 'n_text0001', props: { text: 'before' } }]
});

describe('nodePropSet', () => {
  it('builds a wire-shaped node_prop_set payload', () => {
    expect(nodePropSet('n_text0001', 'text', 'after')).toEqual({
      action: 'node_prop_set',
      node_id: 'n_text0001',
      prop: 'text',
      value: 'after'
    });
  });
});

describe('createEditorOps.setNodeProp', () => {
  it('mutates the live root in place and fires onApplied with the op', () => {
    const root = tree();
    const onApplied = vi.fn();
    const ops = createEditorOps({ getRoot: () => root, onApplied });

    const ok = ops.setNodeProp('n_text0001', 'text', 'after');

    expect(ok).toBe(true);
    expect(findById(root, 'n_text0001')?.props?.text).toBe('after');
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(onApplied).toHaveBeenCalledWith({
      action: 'node_prop_set',
      node_id: 'n_text0001',
      prop: 'text',
      value: 'after'
    });
  });
});

describe('createEditorOps.apply', () => {
  it('returns false and skips onApplied for an unknown action', () => {
    const root = tree();
    const onApplied = vi.fn();
    const ops = createEditorOps({ getRoot: () => root, onApplied });

    expect(ops.apply({ action: 'not_a_real_action' })).toBe(false);
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('is a no-op (false, no onApplied) when the root accessor returns null', () => {
    const onApplied = vi.fn();
    const ops = createEditorOps({ getRoot: () => null, onApplied });

    expect(ops.setNodeProp('n_text0001', 'text', 'x')).toBe(false);
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('routes applyOp errors to onError (and returns false) when provided', () => {
    const root = tree();
    const onApplied = vi.fn();
    const onError = vi.fn();
    const ops = createEditorOps({ getRoot: () => root, onApplied, onError });

    // node_prop_set on a missing node id makes applySetNodeProp throw.
    const ok = ops.setNodeProp('n_missing0', 'text', 'x');

    expect(ok).toBe(false);
    expect(onApplied).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    const [err, op] = onError.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(op).toMatchObject({ action: 'node_prop_set', node_id: 'n_missing0' });
  });

  it('rethrows applyOp errors when no onError handler is given', () => {
    const root = tree();
    const ops = createEditorOps({ getRoot: () => root });
    expect(() => ops.setNodeProp('n_missing0', 'text', 'x')).toThrow();
  });
});
