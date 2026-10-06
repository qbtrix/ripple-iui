// live.ts — the pure half of C4Diagram's live layer: how `status` and
// `selectedId` decorate SvelteFlow nodes, which statuses the legend lists, and
// where the camera goes when the node set, the focus or follow mode changes.
// No DOM, no Svelte: C4Diagram and C4Camera call these, tests call them direct.
//
// Invariant: with no live input, decorateNodes returns the SAME array and node
// objects it was given, so a diagram without the live props renders exactly as
// it did before they existed.

import type { Node } from '@xyflow/svelte';
import type { C4Status } from './types.js';

/** Legend order: what needs attention first. */
export const STATUS_ORDER: C4Status[] = ['failed', 'changing', 'drift', 'changed', 'landed'];

export const STATUS_LABELS: Record<C4Status, string> = {
  failed: 'Failed check',
  changing: 'Changing now',
  drift: 'Drift',
  changed: 'Changed',
  landed: 'Landed',
};

export interface LiveInput {
  status?: Record<string, C4Status>;
  /** When defined, selection is controlled: exactly this node is selected. */
  selectedId?: string;
}

export function decorateNodes(nodes: Node[], live: LiveInput): Node[] {
  const { status, selectedId } = live;
  if (!status && selectedId === undefined) return nodes;
  return nodes.map((n) => {
    const st = status?.[n.id];
    const selected = selectedId === undefined ? !!n.selected : n.id === selectedId;
    if (!st && selected === !!n.selected) return n;
    return {
      ...n,
      selected,
      ...(st ? { domAttributes: { ...n.domAttributes, 'data-c4-status': st } } : {}),
    };
  });
}

/** The statuses present on the given node ids, in legend order. */
export function statusesPresent(status: Record<string, C4Status> | undefined, ids: Iterable<string>): C4Status[] {
  if (!status) return [];
  const seen = new Set<C4Status>();
  for (const id of ids) {
    const st = status[id];
    if (st) seen.add(st);
  }
  return STATUS_ORDER.filter((s) => seen.has(s));
}

/** A stable key for a node set: changes only when ids are added or removed. */
export function nodeSetKey(nodes: readonly { id: string }[]): string {
  return nodes.map((n) => n.id).sort().join('\n');
}

export interface CameraState {
  /** nodeSetKey of the rendered nodes. */
  ids: string;
  focusId?: string;
  follow?: boolean;
}

/** fitView all nodes (no nodeId) or frame one; animate or jump. */
export interface CameraMove {
  nodeId?: string;
  animate: boolean;
}

/**
 * Where the camera goes after a change. A new node set (a level swap, a first
 * layout) always refits, instantly: gliding between unrelated layouts reads as
 * flying through nothing. Within one node set the camera moves only while
 * following: to a new focus, or back to the focus when follow turns on.
 * A focus that is not in the node set fits everything instead.
 */
export function planCamera(prev: CameraState | null, next: CameraState): CameraMove | null {
  const inView = !!next.focusId && next.ids.split('\n').includes(next.focusId);
  const target = next.follow && inView ? next.focusId : undefined;
  if (!prev || prev.ids !== next.ids) return { nodeId: target, animate: false };
  if (!next.follow) return null;
  if (prev.follow && prev.focusId === next.focusId) return null;
  return { nodeId: target, animate: true };
}
