/**
 * @file spec-id.ts
 * @description Stable identifiers for UISpec nodes. Use to address
 * individual widgets in a tree across edits (e.g. when streaming
 * incremental updates from a backend, drag-and-drop, undo/redo, or any
 * other workflow that needs to refer to a specific node by name rather
 * than by tree path).
 *
 * Format: `n_<8 chars from [a-z0-9]>`. 40 bits of randomness — at the
 * tree sizes typical for UI specs (max ~1k nodes) collision probability
 * is negligible, and the format is short enough to copy/paste over the
 * wire.
 *
 * IDs are scoped per spec (per `UISpec` root). Two different specs can
 * legitimately share node IDs without conflict.
 */

import type { UINode } from '../schema/ui-spec.js';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ID_LEN = 8;
const ID_REGEX = /^n_[a-z0-9]{8}$/;

export function newNodeId(): string {
  // crypto.getRandomValues is universally available in browsers and in
  // Node 18+. Fallback to Math.random for environments where it isn't.
  const bytes = new Uint8Array(ID_LEN);
  try {
    globalThis.crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < ID_LEN; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = 'n_';
  for (let i = 0; i < ID_LEN; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function isValidNodeId(value: unknown): value is string {
  return typeof value === 'string' && ID_REGEX.test(value);
}

/**
 * Walk `node` and its children, assigning `id` to any node that lacks
 * one. Sibling-ID collisions are resolved by reassigning duplicates so
 * the tree ends up uniquely keyed. Returns `true` if any id was
 * assigned.
 */
export function ensureNodeIds(node: UINode): boolean {
  const seen = new Set<string>();
  return ensureWalk(node, seen);
}

function ensureWalk(node: UINode, seen: Set<string>): boolean {
  let changed = false;
  if (!isValidNodeId(node.id) || (typeof node.id === 'string' && seen.has(node.id))) {
    let next = newNodeId();
    while (seen.has(next)) next = newNodeId();
    node.id = next;
    changed = true;
  }
  seen.add(node.id as string);

  for (const key of ['children', 'else_children'] as const) {
    const kids = (node as Record<string, unknown>)[key];
    if (Array.isArray(kids)) {
      for (const kid of kids) {
        if (kid && typeof kid === 'object') {
          if (ensureWalk(kid as UINode, seen)) changed = true;
        }
      }
    }
  }
  return changed;
}
