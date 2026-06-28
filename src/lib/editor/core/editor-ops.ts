/**
 * @file editor/core/editor-ops.ts
 * @description L1 (PURE TS, zero Svelte/rune imports) one-op apply SEAM for the
 *   Ripple visual editor (SP-1b). This is the single choke point every editor
 *   mutation flows through — inline text edit AND inspector prop edit both call
 *   `setNodeProp`, which builds one wire-shaped `node_prop_set` payload and runs
 *   it through `spec-mutator`'s `applyOp` against the host's live root.
 *
 *   The host owns the spec in Svelte `$state` (a deep proxy) and passes a
 *   `getRoot` accessor; `applyOp` mutates that proxy IN PLACE, so the canvas
 *   repaints reactively (SP-0 §3). After a successful op, `onApplied(op)` fires —
 *   that is the documented interception point SP-1c (persistence / Branch) hangs
 *   off to `saveDraft(root)` without any change to the call sites. Keeping the
 *   op stream behind one function means undo/redo (a later slice) can also wrap
 *   it (capture the inverse `applyOp` returns) in exactly one place.
 *
 *   Pure: no Svelte, no DOM. The only reactivity is in the host's `$state` root;
 *   this module just routes payloads, so it is fully unit-testable over a plain
 *   object tree.
 * @created 2026-06-27 (SP-1b — branch spike/editor-domid-overlay)
 */
import type { UINode } from '../../schema/ui-spec.js';
import { applyOp } from '../../core/spec-mutator.js';

/** A mutation payload as understood by `spec-mutator`'s `applyOp`. */
export type EditorOp = Record<string, unknown>;

/**
 * Build a wire-shaped `node_prop_set` payload — the one op SP-1b emits. `prop`
 * may be a top-level field (`text` is in `props`; `class`/`show`/… are top-level
 * — `applySetNodeProp` routes them) or a dotted path into `props`.
 */
export function nodePropSet(node_id: string, prop: string, value: unknown): EditorOp {
  return { action: 'node_prop_set', node_id, prop, value };
}

export interface EditorOpsOptions {
  /**
   * Accessor for the live root node. MUST return the same `$state` proxy the
   * renderer reads, or mutations won't be reactive. Returning null/undefined
   * makes `apply` a no-op (returns false) instead of throwing.
   */
  getRoot: () => UINode | null | undefined;
  /**
   * Called after an op is successfully applied, with the op that ran. SP-1c
   * persistence hooks here (e.g. debounce a `saveDraft(getRoot())`); the host's
   * lab wiring uses it to bump the overlay's re-measure `renderVersion`.
   */
  onApplied?: (op: EditorOp) => void;
  /** Called when `applyOp` throws (bad node id, illegal move). Defaults to rethrow. */
  onError?: (err: unknown, op: EditorOp) => void;
}

export interface EditorOps {
  /** Apply one raw op; returns whether `applyOp` recognized + applied it. */
  apply: (op: EditorOp) => boolean;
  /** Convenience for the only op SP-1b emits — builds + applies `node_prop_set`. */
  setNodeProp: (node_id: string, prop: string, value: unknown) => boolean;
}

/**
 * Create the editor op seam bound to a host's live root accessor. Every editor
 * entry point (inline edit, inspector) goes through the returned `apply` /
 * `setNodeProp`, so `onApplied` is the one place to wire persistence/undo later.
 */
export function createEditorOps(opts: EditorOpsOptions): EditorOps {
  function apply(op: EditorOp): boolean {
    const root = opts.getRoot();
    if (!root) return false;
    let ok = false;
    try {
      ok = applyOp(root, op);
    } catch (err) {
      if (opts.onError) {
        opts.onError(err, op);
        return false;
      }
      throw err;
    }
    if (ok) opts.onApplied?.(op);
    return ok;
  }

  function setNodeProp(node_id: string, prop: string, value: unknown): boolean {
    return apply(nodePropSet(node_id, prop, value));
  }

  return { apply, setNodeProp };
}
