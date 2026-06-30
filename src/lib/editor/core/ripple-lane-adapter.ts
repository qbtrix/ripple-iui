/**
 * @file editor/core/ripple-lane-adapter.ts
 * @description L1 (PURE TS, zero Svelte/rune imports) the RIPPLE implementation of
 *   the `LaneAdapter` port (EP-1). It adapts the existing editor primitives —
 *   `resolveElementToNodeId` (DOM -> node id), `findById` (read), `inferFields`
 *   (manifest fields), and the `EditorOps` one-op seam over `spec-mutator` (write)
 *   — to the lane-agnostic `LaneAdapter` interface, so the chrome can drive the
 *   ripple substrate without importing any of those directly.
 *
 *   COERCION lives HERE, not in the chrome. `applyEdit({kind:'setProp'})` accepts
 *   a RAW control value and coerces it to the prop's model type by re-deriving the
 *   field's kind/numeric from the manifest (`inferFields(node)`) and calling
 *   `coerceFieldValue` — the exact (kind, numeric) the inspector used to read off
 *   `inferFields` itself, so the write is byte-identical to the pre-port path. The
 *   inspector is thereby freed of every coercion / manifest import.
 *
 *   WRITE PATH. All four mutating ops route through one internal `EditorOps`
 *   (`createEditorOps({ getRoot, onApplied })`), so `onApplied` fires after each
 *   successful apply exactly as before (the lab bumps `renderVersion` off it) and
 *   a future undo/redo still wraps a single choke point. `applyEdit` never throws:
 *   a bad ref / illegal move is swallowed and reported as `false` (the port
 *   contract), so the chrome branches on a boolean, not a try/catch.
 *
 *   BOUNDARY. `resolveElement` needs the ancestor-walk boundary (the render
 *   container) that the port signature can't carry, so the host supplies it via an
 *   optional `getBoundary` accessor — the same stage element every other editor
 *   piece already receives. When omitted, the walk runs to the document root,
 *   which stays correct because `knownIds` is the precise allow-list (host chrome
 *   can't carry a known node id).
 * @created 2026-06-30 (EP-1 — LaneAdapter port + Ripple adapter)
 */
import type { UINode } from '../../schema/ui-spec.js';
import { findById } from '../../core/spec-mutator.js';
import { resolveElementToNodeId } from './bounds-index.js';
import { inferFields, coerceFieldValue, type InspectorField } from './inspector-fields.js';
import { primaryTextProp, isRichTextWidget, RICH_TEXT_PROP } from './editable.js';
import { createEditorOps, type EditorOp, type EditorOps } from './editor-ops.js';
import type { EditableNode, EditOp, LaneAdapter, TargetRef } from './lane-adapter.js';

export interface RippleLaneAdapterOptions {
  /**
   * Accessor for the live root node. MUST return the same `$state` proxy the
   * renderer reads, or writes won't be reactive (same contract as `EditorOps`).
   */
  getRoot: () => UINode | null | undefined;
  /** Fired after each successful apply (the lab bumps its re-measure version). */
  onApplied?: (op: EditorOp) => void;
  /** Precise node-id allow-list for element resolution (author content can't pass). */
  knownIds?: Set<string> | null;
  /**
   * Ancestor-walk boundary for `resolveElement` (EXCLUSIVE) — typically the render
   * container. Omit to walk to the document root (safe under `knownIds`).
   */
  getBoundary?: () => Element | null;
}

/** The ripple substrate adapter (the first `LaneAdapter`). */
export class RippleLaneAdapter implements LaneAdapter {
  readonly id = 'ripple';
  readonly inlineEditor = 'tiptap' as const;

  #getRoot: () => UINode | null | undefined;
  #knownIds: Set<string> | null;
  #getBoundary?: () => Element | null;
  #ops: EditorOps;

  constructor(opts: RippleLaneAdapterOptions) {
    this.#getRoot = opts.getRoot;
    this.#knownIds = opts.knownIds ?? null;
    this.#getBoundary = opts.getBoundary;
    // One internal seam for every write. onError swallows so applyEdit returns a
    // boolean instead of throwing (the port contract); onApplied still fires.
    this.#ops = createEditorOps({
      getRoot: opts.getRoot,
      onApplied: opts.onApplied,
      onError: () => {}
    });
  }

  /** Clicked / hovered element -> its `TargetRef`, walking up to the nearest node. */
  resolveElement(el: Element): TargetRef | null {
    const uid = resolveElementToNodeId(el, {
      knownIds: this.#knownIds,
      boundary: this.#getBoundary?.() ?? null
    });
    return uid ? { uid, lane: this.id } : null;
  }

  /** Normalized view of the target node, or null when it no longer exists. */
  readNode(ref: TargetRef): EditableNode | null {
    const node = findById(this.#getRoot(), ref.uid);
    if (!node?.id) return null;
    const props = (node.props ?? {}) as Record<string, unknown>;
    const childUids = (node.children ?? [])
      .map((c) => c?.id)
      .filter((id): id is string => !!id);
    const node_: EditableNode = { uid: node.id, type: node.type, props: { ...props }, childUids };
    const text = readPrimaryText(node, props);
    if (text !== undefined) node_.text = text;
    return node_;
  }

  /** The target's children as refs, in document order. */
  listChildren(ref: TargetRef): TargetRef[] {
    const node = findById(this.#getRoot(), ref.uid);
    if (!node?.children) return [];
    return node.children
      .filter((c): c is UINode & { id: string } => !!c?.id)
      .map((c) => ({ uid: c.id, lane: this.id }));
  }

  /** Manifest fields (with current values) for the target — drives the inspector. */
  getFields(ref: TargetRef): InspectorField[] {
    return inferFields(findById(this.#getRoot(), ref.uid));
  }

  /** Apply one edit; returns whether it was recognized and applied. */
  applyEdit(ref: TargetRef, op: EditOp): boolean {
    switch (op.kind) {
      case 'setProp':
        return this.#ops.setNodeProp(ref.uid, op.name, this.#coerceProp(ref, op.name, op.value));
      case 'setText': {
        const prop = this.#textProp(ref);
        return prop ? this.#ops.setNodeProp(ref.uid, prop, op.html) : false;
      }
      case 'insertChild':
        return this.#ops.apply(insertChildOp(ref.uid, op, this.#getRoot()));
      case 'moveChild':
        return this.#ops.apply(moveChildOp(ref.uid, op, this.#getRoot()));
      case 'removeChild':
        return this.#ops.apply({ action: 'node_removed', node_id: op.childUid });
      default:
        return false;
    }
  }

  /**
   * Coerce a RAW prop value to its model type by re-deriving the field's
   * kind/numeric from the manifest — the same (kind, numeric) the inspector read
   * off `inferFields`, so the write is identical to the pre-port path. A prop with
   * no inferred field (shouldn't happen on the inspector path) passes through.
   */
  #coerceProp(ref: TargetRef, name: string, raw: unknown): unknown {
    const field = this.getFields(ref).find((f) => f.prop === name);
    return field ? coerceFieldValue(field.kind, raw, field.numeric) : raw;
  }

  /** The prop `setText` writes for this node: rich-HTML prop, else primary text prop. */
  #textProp(ref: TargetRef): string | null {
    const node = findById(this.#getRoot(), ref.uid);
    if (!node) return null;
    return isRichTextWidget(node.type) ? RICH_TEXT_PROP : primaryTextProp(node.type);
  }
}

/** Current primary text / rich-HTML value of a node, when it has a string one. */
function readPrimaryText(node: UINode, props: Record<string, unknown>): string | undefined {
  const prop = isRichTextWidget(node.type) ? RICH_TEXT_PROP : primaryTextProp(node.type);
  if (!prop) return undefined;
  const value = props[prop];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Map `insertChild` -> a `node_added` payload. `after_id` is the id of the child
 * currently before `index` (insert AFTER it); index 0 / empty parent fall through
 * to an anchorless add. NOTE: `node_added` appends when anchorless, so inserting
 * at index 0 of a NON-empty parent lands last — a `node_added` contract limit, not
 * a bug here. The slice that actually wires insertChild handles strict-position-0
 * (e.g. a follow-up move); the inspector slice never inserts.
 */
function insertChildOp(parentId: string, op: { childType: string; index: number }, root: UINode | null | undefined): EditorOp {
  const kids = findById(root, parentId)?.children ?? [];
  const after = op.index > 0 ? kids[op.index - 1]?.id ?? null : null;
  return { action: 'node_added', parent_id: parentId, after_id: after, subtree: { type: op.childType } };
}

/**
 * Map `moveChild` -> a `node_moved` payload. `toIndex` is the FINAL position among
 * siblings; `after_id` is the sibling that should precede the moved child in the
 * post-move list (computed over the siblings WITHOUT the moving child, since
 * `applyMoveNode` removes it before re-inserting). Empty `after_id` inserts first.
 */
function moveChildOp(parentId: string, op: { childUid: string; toIndex: number }, root: UINode | null | undefined): EditorOp {
  const kids = findById(root, parentId)?.children ?? [];
  const rest = kids.map((c) => c?.id).filter((id): id is string => !!id && id !== op.childUid);
  const clamped = Math.min(Math.max(op.toIndex, 0), rest.length);
  const after = clamped === 0 ? '' : rest[clamped - 1];
  return { action: 'node_moved', node_id: op.childUid, new_parent_id: parentId, after_id: after };
}
