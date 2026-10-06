// semantic-flow.ts — builds the SvelteFlow graph for semantic zoom: every drawn element as a node
// (cards, boundaries with their children nested by parentId, code panels), every lifted edge with
// its ELK route, port badges and hover lists, ghosting outside the scope, and each node's absolute
// box for the camera. C4Diagram calls it whenever the diagram, the expanded set or the scope changes.
//
// Invariants: nodes come parents-first (SvelteFlow requires it); a child's position is relative to
// its parent; every node carries its ELK width/height so routes meet card edges.

import type { Edge, Node } from '@xyflow/svelte';
import { BOUNDARY_TOP, computeSemanticLayout, getNodeDimensions, getNodeType, type LayoutPosition } from './elk-layout.js';
import { edgeLook, sharedStyle } from './live.js';
import {
  childrenOf,
  codePanelSize,
  computeVisibility,
  ghostIds,
  indexTree,
  kindLabel,
  liftRelationships,
  type C4Tree,
  type PortItem,
  type Visibility,
} from './semantic.js';
import type { C4Diagram, C4Element, C4NodeData } from './types.js';

export interface SemanticFlow {
  nodes: Node[];
  edges: Edge[];
  /** Absolute boxes of every drawn element. */
  rects: Map<string, LayoutPosition>;
  tree: C4Tree;
  vis: Visibility;
}

export interface FlowHandlers {
  onclick?: (elementId: string) => void;
  ondrilldown?: (elementId: string, level: string) => void;
}

/** The element as a collapsed card: child arrays emptied so its shape is a card, not a frame. */
function asCard(el: C4Element): C4Element {
  const e = el as C4Element & { containers?: unknown[]; components?: unknown[] };
  return {
    ...el,
    ...(Array.isArray(e.containers) ? { containers: [] } : {}),
    ...(Array.isArray(e.components) ? { components: [] } : {}),
  } as C4Element;
}

/** A boundary must fit its label row: kind, name, technology and (for the scope) its chips. */
function boundaryMinimum(el: C4Element, chipTexts: string[]): { width: number; height: number } {
  const tech = 'technology' in el ? ((el as { technology?: string }).technology ?? '') : '';
  const width =
    28 + kindLabel(el).length * 7 + 8 + el.name.length * 7.8 + (tech ? 8 + tech.length * 6.4 : 0) +
    chipTexts.reduce((w, t) => w + 12 + t.length * 6.6 + 24, 0);
  return { width: Math.max(320, Math.ceil(width)), height: BOUNDARY_TOP + 64 };
}

export async function buildSemanticFlow(
  diagram: C4Diagram,
  expanded: ReadonlySet<string>,
  scopeId: string | undefined,
  handlers: FlowHandlers
): Promise<SemanticFlow> {
  const tree = indexTree(diagram.elements);
  const vis = computeVisibility(tree, expanded);
  const { edges: lifted, chips } = liftRelationships(tree, vis, diagram.relationships, scopeId);
  const ghosts = ghostIds(tree, vis, scopeId);
  const nameOf = (id: string) => tree.byId.get(id)?.name ?? id;
  const named = (items: PortItem[]) => items.map((it) => ({ from: nameOf(it.from), to: nameOf(it.to), label: it.label }));

  const { positions, routes } = await computeSemanticLayout(
    tree,
    vis,
    lifted,
    (id) => {
      const el = tree.byId.get(id)!;
      return vis.panels.has(id) && el.code ? codePanelSize(el.code) : getNodeDimensions(asCard(el));
    },
    (id) => boundaryMinimum(tree.byId.get(id)!, id === scopeId ? chips.map((c) => c.text) : [])
  );

  const nodes: Node[] = [];
  for (const id of vis.visible) {
    const el = tree.byId.get(id);
    const pos = positions.get(id);
    if (!el || !pos) continue;
    const parentId = tree.parent.get(id) ?? undefined;
    const parentPos = parentId ? positions.get(parentId) : undefined;
    const isBoundary = vis.boundaries.has(id);
    const isPanel = vis.panels.has(id);
    const card = asCard(el);
    const data: C4NodeData = {
      name: el.name,
      description: el.description,
      technology: 'technology' in el ? (el as { technology?: string }).technology : undefined,
      external: 'external' in el ? (el as { external?: boolean }).external : false,
      subtype: 'type' in el ? (el as { type?: string }).type : undefined,
      drillable: !isBoundary && !isPanel && (childrenOf(el).length > 0 || !!el.code || !!el.drillable),
      kb_article: 'kb_article' in el ? (el as { kb_article?: string }).kb_article : undefined,
      tags: 'tags' in el ? (el as { tags?: string[] }).tags : undefined,
      kind: el.kind,
      element: el,
      diagramLevel: diagram.level,
      onclick: handlers.onclick ? (e) => handlers.onclick?.(e.id) : undefined,
      ondrilldown: handlers.ondrilldown ? (e, level) => handlers.ondrilldown?.(e.id, level) : undefined,
      ...(id === scopeId && chips.length > 0 ? { ports: chips.map((c) => ({ text: c.text, items: named(c.items) })) } : {}),
      ...(isPanel ? { code: el.code } : {}),
    };
    nodes.push({
      id,
      type: isBoundary ? 'group' : isPanel ? 'code' : getNodeType(card),
      position: { x: pos.x - (parentPos?.x ?? 0), y: pos.y - (parentPos?.y ?? 0) },
      data: data as unknown as Record<string, unknown>,
      draggable: false,
      selectable: true,
      width: pos.width,
      height: pos.height,
      ...(isBoundary ? { style: `width: ${pos.width}px; height: ${pos.height}px;` } : {}),
      ...(parentPos ? { parentId } : {}),
      ...(ghosts.has(id) ? { domAttributes: { 'data-c4-ghost': '' } } : {}),
    });
  }

  const edges: Edge[] = lifted.map((e) => {
    const route = routes.get(e.key);
    const ghost = ghosts.has(e.from) && ghosts.has(e.to);
    const items = named(e.items);
    const look = edgeLook(sharedStyle(e.items.map((it) => it.style)));
    return {
      id: `edge-${e.key}`,
      source: e.from,
      target: e.to,
      type: route ? 'c4' : 'smoothstep',
      label: e.label,
      style: look.style,
      animated: look.animated,
      ...(ghost ? { class: 'c4-ghost' } : {}),
      data: {
        points: route?.points,
        labelBox: route?.label,
        items,
        ghost,
        tail: e.fromBadge && route?.tail ? { box: route.tail, text: e.fromBadge } : undefined,
        head: e.toBadge && route?.head ? { box: route.head, text: e.toBadge } : undefined,
      },
    };
  });

  return { nodes, edges, rects: positions, tree, vis };
}
