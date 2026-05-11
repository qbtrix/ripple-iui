/**
 * @file spec-mutator.ts
 * @description Pure, in-place mutations on a UISpec tree, keyed by stable
 * node IDs (see `./spec-id.js`).
 *
 * Each operation (`applyAddNode`, `applyReplaceNode`, `applySetNodeProp`,
 * `applyMoveNode`, `applyRemoveNode`) mutates the tree directly and
 * returns either the changed subtree or the prior value (used as the
 * inverse when building undo/redo). The functions never touch
 * reactivity — wrap them in your own store (e.g. Svelte 5 `$state`)
 * for reactive rendering.
 *
 * The dispatch helper `applyOp` reads `payload.action` and routes to
 * the matching operation. It returns `true` when the action was
 * recognised and applied, `false` when it wasn't — callers handle
 * unknown actions however they like (typically by refetching).
 *
 * Payload shape conventions (action → required fields):
 *   - "node_added"     → { parent_id, after_id?, subtree }
 *   - "node_replaced"  → { node_id, subtree }
 *   - "node_prop_set"  → { node_id, prop, value }
 *   - "node_moved"     → { node_id, new_parent_id, after_id? }
 *   - "node_removed"   → { node_id }
 *
 * These are designed to be wire-compatible with any source emitting
 * the same shape (server-sent events, websocket frames, local actions).
 */

import type { UINode } from '../schema/ui-spec.js';
import { ensureNodeIds, isValidNodeId, newNodeId } from './spec-id.js';

const CHILD_KEYS = ['children', 'else_children'] as const;
type ChildKey = (typeof CHILD_KEYS)[number];

const TOP_LEVEL_PROP_KEYS = new Set([
  'show',
  'class',
  'style',
  'bind',
  'items',
  'item_as',
  'index_as',
  'condition',
  'slot',
  'on_click',
  'on_change',
  'on_input',
  'on_submit',
  'on_focus',
  'on_blur',
]);

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function findById(root: UINode | null | undefined, id: string): UINode | null {
  if (!root || !id) return null;
  if (root.id === id) return root;
  for (const key of CHILD_KEYS) {
    const kids = root[key];
    if (!Array.isArray(kids)) continue;
    for (const kid of kids) {
      const found = findById(kid, id);
      if (found) return found;
    }
  }
  return null;
}

interface ParentLoc {
  parent: UINode;
  key: ChildKey;
  index: number;
}

export function findParent(root: UINode | null | undefined, id: string): ParentLoc | null {
  if (!root || !id) return null;
  for (const key of CHILD_KEYS) {
    const kids = root[key];
    if (!Array.isArray(kids)) continue;
    for (let i = 0; i < kids.length; i++) {
      const kid = kids[i];
      if (kid && kid.id === id) {
        return { parent: root, key, index: i };
      }
      const inner = findParent(kid, id);
      if (inner) return inner;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface AddNodeOp {
  parent_id: string;
  after_id?: string | null;
  subtree: UINode;
}

export function applyAddNode(root: UINode, op: AddNodeOp): void {
  const parent = findById(root, op.parent_id);
  if (!parent) {
    throw new Error(`no node with id ${op.parent_id}`);
  }
  if (!Array.isArray(parent.children)) {
    parent.children = [];
  }
  const node: UINode = { ...op.subtree };
  if (!isValidNodeId(node.id)) {
    node.id = newNodeId();
  }
  ensureNodeIds(node);

  if (!op.after_id) {
    parent.children.push(node);
    return;
  }
  const idx = parent.children.findIndex((c) => c?.id === op.after_id);
  if (idx === -1) {
    throw new Error(`after_id ${op.after_id} is not a child of ${op.parent_id}`);
  }
  parent.children.splice(idx + 1, 0, node);
}

export interface ReplaceNodeOp {
  node_id: string;
  subtree: UINode;
}

export function applyReplaceNode(root: UINode, op: ReplaceNodeOp): UINode {
  if (root.id === op.node_id) {
    throw new Error('cannot replace the root via replace_node');
  }
  const loc = findParent(root, op.node_id);
  if (!loc) throw new Error(`no node with id ${op.node_id}`);
  const old = loc.parent[loc.key]![loc.index];
  const replacement: UINode = { ...op.subtree };
  if (!isValidNodeId(replacement.id)) {
    replacement.id = old.id ?? newNodeId();
  }
  loc.parent[loc.key]![loc.index] = replacement;
  return old;
}

export interface SetNodePropOp {
  node_id: string;
  prop: string;
  value: unknown;
}

export function applySetNodeProp(root: UINode, op: SetNodePropOp): unknown {
  if (!op.prop) throw new Error('prop is required');
  const node = findById(root, op.node_id);
  if (!node) throw new Error(`no node with id ${op.node_id}`);

  if (op.prop.includes('.')) {
    if (!node.props || typeof node.props !== 'object') node.props = {};
    return setDotted(node.props as Record<string, unknown>, op.prop, op.value);
  }
  if (TOP_LEVEL_PROP_KEYS.has(op.prop)) {
    const old = (node as Record<string, unknown>)[op.prop];
    (node as Record<string, unknown>)[op.prop] = op.value;
    return old;
  }
  if (!node.props || typeof node.props !== 'object') node.props = {};
  const props = node.props as Record<string, unknown>;
  const old = props[op.prop];
  props[op.prop] = op.value;
  return old;
}

function setDotted(container: Record<string, unknown>, path: string, value: unknown): unknown {
  const parts = path.split('.');
  const last = parts.pop()!;
  let cursor = container;
  for (const part of parts) {
    const next = cursor[part];
    if (!next || typeof next !== 'object') {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  const old = cursor[last];
  cursor[last] = value;
  return old;
}

export interface MoveNodeOp {
  node_id: string;
  new_parent_id: string;
  after_id?: string | null;
}

export function applyMoveNode(root: UINode, op: MoveNodeOp): void {
  if (root.id === op.node_id) throw new Error('cannot move the root node');
  const src = findParent(root, op.node_id);
  if (!src) throw new Error(`no node with id ${op.node_id}`);
  const newParent = findById(root, op.new_parent_id);
  if (!newParent) throw new Error(`no parent with id ${op.new_parent_id}`);

  const subtree = src.parent[src.key]![src.index];
  if (findById(subtree, op.new_parent_id)) {
    throw new Error('cannot move a node into itself or its descendants');
  }

  src.parent[src.key]!.splice(src.index, 1);
  try {
    if (!Array.isArray(newParent.children)) newParent.children = [];
    if (!op.after_id) {
      newParent.children.push(subtree);
      return;
    }
    const idx = newParent.children.findIndex((c) => c?.id === op.after_id);
    if (idx === -1) {
      throw new Error(`after_id ${op.after_id} is not a child of ${op.new_parent_id}`);
    }
    newParent.children.splice(idx + 1, 0, subtree);
  } catch (err) {
    src.parent[src.key]!.splice(src.index, 0, subtree);
    throw err;
  }
}

export interface RemoveNodeOp {
  node_id: string;
}

export function applyRemoveNode(root: UINode, op: RemoveNodeOp): UINode {
  if (root.id === op.node_id) throw new Error('cannot remove the root node');
  const loc = findParent(root, op.node_id);
  if (!loc) throw new Error(`no node with id ${op.node_id}`);
  return loc.parent[loc.key]!.splice(loc.index, 1)[0];
}

// ---------------------------------------------------------------------------
// Dispatch by action name
// ---------------------------------------------------------------------------

/**
 * Apply a mutation payload to `root` in place. The payload's `action`
 * field selects the operation; remaining fields supply the operands
 * (see the file header for the per-action shape).
 *
 * Returns `true` when the action was recognised and applied; `false`
 * when the action is unknown (caller decides what to do — typically
 * refetch the full tree).
 */
export function applyOp(root: UINode, payload: Record<string, unknown>): boolean {
  const action = payload.action;
  switch (action) {
    case 'node_added':
      applyAddNode(root, {
        parent_id: String(payload.parent_id),
        after_id: (payload.after_id as string | null | undefined) ?? null,
        subtree: payload.subtree as UINode,
      });
      return true;
    case 'node_replaced':
      applyReplaceNode(root, {
        node_id: String(payload.node_id),
        subtree: payload.subtree as UINode,
      });
      return true;
    case 'node_prop_set':
      applySetNodeProp(root, {
        node_id: String(payload.node_id),
        prop: String(payload.prop),
        value: payload.value,
      });
      return true;
    case 'node_moved':
      applyMoveNode(root, {
        node_id: String(payload.node_id),
        new_parent_id: String(payload.new_parent_id),
        after_id: (payload.after_id as string | null | undefined) ?? null,
      });
      return true;
    case 'node_removed':
      applyRemoveNode(root, { node_id: String(payload.node_id) });
      return true;
    default:
      return false;
  }
}
