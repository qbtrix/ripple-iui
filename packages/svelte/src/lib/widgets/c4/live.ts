// live.ts — the pure half of C4Diagram's live layer: how `status` and
// `selectedId` decorate SvelteFlow nodes, which statuses the legend lists,
// where the camera goes when the node set, the focus or follow mode changes,
// the rounded path C4Edge draws through an ELK route, and the stroke each
// relationship style gets (both the plain and the semantic-zoom graph use it). No DOM, no Svelte:
// C4Diagram, C4LiveLayer and C4Edge call these, tests call them direct.
//
// Invariant: with no live input, decorateNodes returns the SAME array and node
// objects it was given, so a diagram without the live props renders exactly as
// it did before they existed.

import type { Node } from '@xyflow/svelte';
import type { C4Relationship, C4Status } from './types.js';

/** Legend order: what needs attention first; `planned` (not built yet) last. */
export const STATUS_ORDER: C4Status[] = ['failed', 'changing', 'drift', 'changed', 'landed', 'planned'];

export const STATUS_LABELS: Record<C4Status, string> = {
  failed: 'Failed check',
  changing: 'Changing now',
  drift: 'Drift',
  changed: 'Changed',
  landed: 'Landed',
  planned: 'Planned',
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

/**
 * An SVG path through orthogonal points with rounded corners. Each corner's
 * radius shrinks to half the shorter neighbouring segment, so short jogs stay
 * clean instead of overshooting.
 */
export function roundedPath(points: readonly { x: number; y: number }[], radius: number): string {
  if (points.length === 0) return '';
  const n = (v: number) => Math.round(v * 100) / 100;
  let d = `M ${n(points[0].x)} ${n(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [a, b, c] = [points[i - 1], points[i], points[i + 1]];
    const r = Math.min(radius, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.hypot(c.x - b.x, c.y - b.y) / 2);
    const inX = b.x - Math.sign(b.x - a.x) * r;
    const inY = b.y - Math.sign(b.y - a.y) * r;
    const outX = b.x + Math.sign(c.x - b.x) * r;
    const outY = b.y + Math.sign(c.y - b.y) * r;
    d += ` L ${n(inX)} ${n(inY)} Q ${n(b.x)} ${n(b.y)} ${n(outX)} ${n(outY)}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${n(last.x)} ${n(last.y)}`;
}

/** Edge strokes on ripple tokens, as strings: SvelteFlow takes an edge's style inline. */
export const EDGE_STROKE = 'color-mix(in oklab, var(--ripple-muted-foreground) 55%, transparent)';
export const EVENT_STROKE = 'color-mix(in oklab, var(--ripple-warning) 70%, transparent)';

/** How a relationship style draws: sync solid, async dashed and animated, event dashed in the warning tone. */
export function edgeLook(style?: C4Relationship['style']): { style: string; animated: boolean } {
  if (style === 'event') return { style: `stroke: ${EVENT_STROKE}; stroke-width: 1.25px; stroke-dasharray: 4 4;`, animated: false };
  if (style === 'async') return { style: `stroke: ${EDGE_STROKE}; stroke-width: 1.25px; stroke-dasharray: 8 4;`, animated: true };
  return { style: `stroke: ${EDGE_STROKE}; stroke-width: 1.25px;`, animated: false };
}

/** One style for an edge that stands for several relationships: theirs if they all share it, else sync. */
export function sharedStyle(styles: readonly (C4Relationship['style'] | undefined)[]): C4Relationship['style'] {
  const first = styles[0] ?? 'sync';
  return styles.every((s) => (s ?? 'sync') === first) ? first : 'sync';
}

/** A CSS cubic-bezier() as a function of progress t in [0, 1]: Newton steps, bisection fallback. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const x = (s: number) => ((ax * s + bx) * s + cx) * s;
  const y = (s: number) => ((ay * s + by) * s + cy) * s;
  const dx = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const err = x(s) - t;
      if (Math.abs(err) < 1e-6) return y(s);
      const d = dx(s);
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0;
    let hi = 1;
    s = t;
    while (hi - lo > 1e-6) {
      if (x(s) < t) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return y(s);
  };
}

/**
 * The --c4-zoom a card can see. Every reader clamps it into [0.5, 1] (names) or [0.6, 1]
 * (technology, edge labels), so outside [0.5, 1] it changes nothing on screen; two decimals keep a
 * camera ease from rewriting it, and restyling the whole map, on every frame.
 */
export function zoomVar(zoom: number): string {
  return String(Math.round(Math.min(1, Math.max(0.5, zoom)) * 100) / 100);
}

/** The camera's curve: the same as --ripple-ease-out, so camera and layout move as one. */
export const rippleEase = cubicBezier(0.23, 1, 0.32, 1);

export type Rect = { x: number; y: number; width: number; height: number };

export function unionRect(rects: Iterable<Rect>): Rect | null {
  let out: Rect | null = null;
  for (const r of rects) {
    if (!out) {
      out = { ...r };
      continue;
    }
    const x = Math.min(out.x, r.x);
    const y = Math.min(out.y, r.y);
    out = {
      x,
      y,
      width: Math.max(out.x + out.width, r.x + r.width) - x,
      height: Math.max(out.y + out.height, r.y + r.height) - y,
    };
  }
  return out;
}
