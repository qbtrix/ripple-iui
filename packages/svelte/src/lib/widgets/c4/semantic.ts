// semantic.ts — the pure core of C4Diagram's semantic zoom: one canvas where an expanded element
// draws its children inside its own box. Given the element tree and the `expanded` ids it works out
// what is drawn (cards, boundaries, code panels), which edges connect what, which nodes are ghosted
// context, where markers land, and what an in-map code panel shows. No DOM, no Svelte, no ELK.
//
// Edges: a relationship is drawn between the two SIBLINGS that contain its ends, the children of
// the ends' lowest common ancestor (only when that ancestor is the root or an expanded boundary;
// otherwise it is internal to a collapsed card and not drawn). Everything that lifts onto the same
// sibling pair is one edge with a count. Where an end is an expanded boundary, the edge meets the
// boundary's border and carries a port badge there ("→ Ripple · 2"). A relationship that crosses
// the scope boundary but is drawn further out becomes a chip on the scope boundary instead, so the
// view you are inside never loses its outside connections.

import type { C4Code, C4Element, C4Marker, C4Relationship } from './types.js';

/** Nested children of any kind: `children`, else `containers`, else `components`. */
export function childrenOf(el: C4Element): C4Element[] {
  const e = el as { children?: C4Element[]; containers?: C4Element[]; components?: C4Element[] };
  return e.children ?? e.containers ?? e.components ?? [];
}

export interface C4Tree {
  byId: Map<string, C4Element>;
  parent: Map<string, string | null>;
  /** Depth-first order: a parent always comes before its children. */
  order: string[];
}

export function indexTree(elements: readonly C4Element[]): C4Tree {
  const byId = new Map<string, C4Element>();
  const parent = new Map<string, string | null>();
  const order: string[] = [];
  const walk = (els: readonly C4Element[], p: string | null) => {
    for (const el of els) {
      byId.set(el.id, el);
      parent.set(el.id, p);
      order.push(el.id);
      walk(childrenOf(el), el.id);
    }
  };
  walk(elements, null);
  return { byId, parent, order };
}

/** Ids from the top level down to `id`, inclusive; empty for an unknown id. */
export function pathTo(tree: C4Tree, id: string): string[] {
  const path: string[] = [];
  for (let cur: string | null | undefined = id; cur; cur = tree.parent.get(cur)) {
    if (!tree.byId.has(cur)) return [];
    path.unshift(cur);
  }
  return path;
}

export interface Visibility {
  /** Everything drawn, in depth-first order. */
  visible: string[];
  /** Expanded elements with children: drawn as frames around them. */
  boundaries: Set<string>;
  /** Expanded code elements with an excerpt: drawn as code panels. */
  panels: Set<string>;
}

export function computeVisibility(tree: C4Tree, expanded: ReadonlySet<string>): Visibility {
  const visible: string[] = [];
  const boundaries = new Set<string>();
  const panels = new Set<string>();
  const walk = (ids: readonly string[]) => {
    for (const id of ids) {
      const el = tree.byId.get(id);
      if (!el) continue;
      visible.push(id);
      if (!expanded.has(id)) continue;
      const kids = childrenOf(el);
      if (kids.length > 0) {
        boundaries.add(id);
        walk(kids.map((k) => k.id));
      } else if (el.code) panels.add(id);
    }
  };
  walk(tree.order.filter((id) => tree.parent.get(id) === null));
  return { visible, boundaries, panels };
}

/** The deepest drawn element on the path to `id` (itself when drawn). */
export function representative(tree: C4Tree, vis: Visibility, id: string): string | undefined {
  const drawn = new Set(vis.visible);
  return pathTo(tree, id).filter((p) => drawn.has(p)).at(-1);
}

export interface PortItem {
  from: string;
  to: string;
  label?: string;
}

export interface LiftedEdge {
  /** Stable key: the sibling pair. */
  key: string;
  from: string;
  to: string;
  items: PortItem[];
  /** Middle label (both ends are cards). */
  label?: string;
  /** Badge where the edge meets `from`, when `from` is an expanded boundary. */
  fromBadge?: string;
  toBadge?: string;
}

export interface ScopeChip {
  /** The drawn element on the far side. */
  target: string;
  text: string;
  items: PortItem[];
}

const nameOf = (tree: C4Tree, id: string) => tree.byId.get(id)?.name ?? id;
const labelOf = (r: C4Relationship) => [r.label, r.technology ? `[${r.technology}]` : ''].filter(Boolean).join(' ');

/** "→ Ripple · 2" from `side`'s point of view: arrows by direction, ⇄ when mixed. */
function badge(tree: C4Tree, other: string, items: readonly PortItem[], outward: (it: PortItem) => boolean): string {
  const out = items.filter(outward).length;
  const arrow = out === items.length ? '→' : out === 0 ? '←' : '⇄';
  return `${arrow} ${nameOf(tree, other)} · ${items.length}`;
}

const inside = (tree: C4Tree, id: string, root: string) => pathTo(tree, id).includes(root);

/**
 * Lift every relationship onto drawn siblings and aggregate. Also returns the chips for `scopeId`
 * (relationships crossing its border that are drawn further out) and the item lists by edge.
 */
export function liftRelationships(
  tree: C4Tree,
  vis: Visibility,
  relationships: readonly C4Relationship[],
  scopeId?: string
): { edges: LiftedEdge[]; chips: ScopeChip[] } {
  const drawn = new Set(vis.visible);
  const byPair = new Map<string, { a: string; b: string; items: PortItem[]; direct: string[] }>();
  const chipItems = new Map<string, PortItem[]>();

  for (const r of relationships) {
    const pa = pathTo(tree, r.from);
    const pb = pathTo(tree, r.to);
    if (pa.length === 0 || pb.length === 0) continue;
    let i = 0;
    while (i < pa.length && i < pb.length && pa[i] === pb[i]) i++;
    if (i === pa.length || i === pb.length) continue; // one end contains the other
    const lca = i === 0 ? null : pa[i - 1];
    const [sa, sb] = [pa[i], pb[i]];
    const item: PortItem = { from: r.from, to: r.to, label: labelOf(r) || undefined };

    if (lca === null || vis.boundaries.has(lca)) {
      if (drawn.has(sa) && drawn.has(sb)) {
        const key = [sa, sb].sort().join('|');
        const pair = byPair.get(key) ?? { a: sa, b: sb, items: [], direct: [] };
        pair.items.push(item);
        if (sa === r.from && sb === r.to) pair.direct.push(labelOf(r));
        byPair.set(key, pair);
      }
    }

    // A crossing of the scope border not drawn at the scope itself becomes a chip there.
    if (scopeId && vis.boundaries.has(scopeId)) {
      const fromIn = inside(tree, r.from, scopeId);
      const toIn = inside(tree, r.to, scopeId);
      const drawnAtScope = sa === scopeId || sb === scopeId;
      if (fromIn !== toIn && !drawnAtScope) {
        const far = representative(tree, vis, fromIn ? r.to : r.from);
        if (far) chipItems.set(far, [...(chipItems.get(far) ?? []), item]);
      }
    }
  }

  const edges: LiftedEdge[] = [...byPair.entries()].map(([key, { a, b, items, direct }]) => {
    const aBox = vis.boundaries.has(a);
    const bBox = vis.boundaries.has(b);
    const fromA = (it: PortItem) => inside(tree, it.from, a);
    const fromB = (it: PortItem) => inside(tree, it.from, b);
    // Direct relationships keep their words; the ones lifted from deeper levels are counted.
    const named = direct.filter(Boolean);
    const lifted = items.length - direct.length;
    const label =
      aBox || bBox
        ? undefined
        : named.length > 0
          ? `${named.join(' · ')}${lifted > 0 ? ` +${lifted}` : ''}`
          : `${items.length} connection${items.length === 1 ? '' : 's'}`;
    return {
      key,
      from: a,
      to: b,
      items,
      label,
      fromBadge: aBox ? badge(tree, b, items, fromA) : undefined,
      toBadge: bBox ? badge(tree, a, items, fromB) : undefined,
    };
  });

  const chips: ScopeChip[] = [...chipItems.entries()].map(([target, items]) => ({
    target,
    items,
    text: badge(tree, target, items, (it) => !!scopeId && inside(tree, it.from, scopeId)),
  }));
  return { edges, chips };
}

/** Drawn elements outside the scope: not the scope, not inside it, not one of its ancestors. */
export function ghostIds(tree: C4Tree, vis: Visibility, scopeId?: string): Set<string> {
  if (!scopeId || !tree.byId.has(scopeId)) return new Set();
  const around = new Set(pathTo(tree, scopeId));
  return new Set(vis.visible.filter((id) => !around.has(id) && !inside(tree, id, scopeId)));
}

/** Markers on hidden elements move to their drawn ancestor; one dot per marker id. */
export function liftMarkers(
  tree: C4Tree,
  vis: Visibility,
  markers: Record<string, C4Marker[]> | undefined
): Record<string, C4Marker[]> | undefined {
  if (!markers) return undefined;
  const out: Record<string, C4Marker[]> = {};
  for (const [id, list] of Object.entries(markers)) {
    const at = representative(tree, vis, id);
    if (!at) continue;
    const here = (out[at] ??= []);
    for (const m of list) if (!here.some((h) => h.id === m.id)) here.push(m);
  }
  return out;
}

// ── Code panels ───────────────────────────────────────────────────────────────────────────────

export type CodeSide = 'before' | 'after';

export interface CodeView {
  text: string;
  startLine: number;
  highlight?: [number, number];
  tone: 'accent' | 'added' | 'removed';
  lineCount: number;
}

/** What a panel shows for one side. `after` composes the replacement into the surrounding lines. */
export function codeView(code: C4Code, side: CodeSide): CodeView {
  const { startLine, before, after, changed } = code;
  const view = (lines: string[], highlight?: [number, number], tone: CodeView['tone'] = 'accent'): CodeView => ({
    text: lines.join('\n'),
    startLine,
    highlight,
    tone,
    lineCount: lines.length,
  });
  if (side === 'before' || !after) return view(before, changed, after ? 'removed' : 'accent');
  if (before.length === 0 || !changed) {
    return view(after, after.length ? [startLine, startLine + after.length - 1] : undefined, 'added');
  }
  const head = before.slice(0, changed[0] - startLine);
  const tail = before.slice(changed[1] - startLine + 1);
  return view([...head, ...after, ...tail], after.length ? [changed[0], changed[0] + after.length - 1] : undefined, 'added');
}

export function defaultCodeSide(code: C4Code): CodeSide {
  return code.after ? 'after' : 'before';
}

/** Panel geometry. Matches CodeBlock's body: 12.5px mono at 1.65 leading, wrapping lines. */
export const CODE_PANEL = { width: 720, header: 44, padY: 24, lineHeight: 20.625, charWidth: 7.55, minHeight: 180 } as const;

/** A box tall enough for the longer side once lines wrap, so toggling never overflows. */
export function codePanelSize(code: C4Code): { width: number; height: number } {
  const sides = code.after ? [codeView(code, 'before'), codeView(code, 'after')] : [codeView(code, 'before')];
  const rows = Math.max(
    0,
    ...sides.map((v) => {
      const lastNo = v.startLine + Math.max(0, v.lineCount - 1);
      const gutter = Math.max(20, String(lastNo).length * 7 + 6);
      const perLine = Math.floor((CODE_PANEL.width - 2 - gutter - 16) / CODE_PANEL.charWidth);
      // Word wrap breaks early; a 15% allowance keeps the last row inside the box.
      const wrapped = v.text ? v.text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0) : 0;
      return Math.ceil(wrapped * 1.15);
    })
  );
  const height = CODE_PANEL.header + CODE_PANEL.padY + rows * CODE_PANEL.lineHeight + 8;
  return { width: CODE_PANEL.width, height: Math.max(CODE_PANEL.minHeight, Math.round(height)) };
}
