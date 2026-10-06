// elk-layout.ts — ELK.js layered auto-layout for C4 diagrams, and the mapping
// from a C4 element to its SvelteFlow node type. An element with a non-empty
// `containers` array becomes a nested parent box (a boundary) whatever its
// `kind`. ELK is instantiated per call: a shared instance raced between layouts.
//
// computeElkGraph also returns ELK's orthogonal edge routes (absolute points,
// keyed by the relationship's index in `diagram.relationships`) and a box for
// each label, which ELK reserves space for, so edges go around nodes and labels
// do not stack. ELK reports an edge's points relative to its `container` (the
// lowest common ancestor of its ends); they are offset back to absolute here.

import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
// From types.ts, NOT the barrel: `index.ts` also exports a COMPONENT named
// C4Diagram, so the barrel's `C4Diagram` is the component, not the data type.
// The barrel import here typed `diagram` as a Svelte component instead of a
// diagram — pre-existing, and invisible until the test stopped making the
// same mistake.
import type { C4Diagram, C4Element, C4System, C4Container, C4Relationship } from './types.js';
import { childrenOf, type C4Tree, type LiftedEdge, type Visibility } from './semantic.js';


// Default node dimensions by element shape
const DIMENSIONS = {
  person: { width: 160, height: 140 },
  database: { width: 180, height: 130 },
  queue: { width: 200, height: 110 },
  group: { width: 280, height: 200 },
  default: { width: 200, height: 110 },
} as const;

export interface ElkLayoutOptions {
  direction?: 'DOWN' | 'RIGHT' | 'UP' | 'LEFT';
  nodeSpacing?: number;
  layerSpacing?: number;
}

export interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeRoute {
  /** Absolute points: start on the source box, bends, end on the target box. */
  points: { x: number; y: number }[];
  /** Where ELK put the label (absolute, top-left), when the edge has one. */
  label?: LayoutPosition;
}

/** The text an edge's label shows: its label, then [technology]. */
export function edgeLabelText(r: C4Relationship): string {
  const parts: string[] = [];
  if (r.label) parts.push(r.label);
  if (r.technology) parts.push(`[${r.technology}]`);
  return parts.join(' ');
}

/** ELK needs a label's size up front; this matches the 11px/500 pill C4Diagram draws. */
const labelSize = (text: string) => ({ width: Math.ceil(text.length * 6.3) + 16, height: 20 });

/** Determine ELK node dimensions for a given C4 element */
export function getNodeDimensions(el: C4Element): { width: number; height: number } {
  // Person: an explicit kind, or no technology, type, containers, or components
  const isPerson = el.kind
    ? el.kind === 'person'
    : !('technology' in el) && !('type' in el) && !('containers' in el) && !('components' in el);
  if (isPerson) return DIMENSIONS.person;

  const subtype = 'type' in el ? (el as { type?: string }).type : undefined;
  if (subtype === 'database') return DIMENSIONS.database;
  if (subtype === 'queue') return DIMENSIONS.queue;

  return DIMENSIONS.default;
}

/**
 * Compute ELK-based layout for a C4 diagram.
 *
 * Strategy:
 * - For context/container views: systems with containers become ELK parent nodes,
 *   their containers become ELK children — giving proper nested group boxes.
 * - Relationships map to ELK edges.
 * - Returns a flat Map<id, LayoutPosition> for all elements.
 */
export async function computeElkLayout(
  diagram: C4Diagram,
  options: ElkLayoutOptions = {}
): Promise<Map<string, LayoutPosition>> {
  return (await computeElkGraph(diagram, options)).positions;
}

/** computeElkLayout plus ELK's edge routes and label boxes (empty if ELK failed). */
export async function computeElkGraph(
  diagram: C4Diagram,
  options: ElkLayoutOptions = {}
): Promise<{ positions: Map<string, LayoutPosition>; routes: Map<number, EdgeRoute> }> {
  const {
    direction = 'DOWN',
    nodeSpacing = 60,
    // Each labelled edge adds a label row between two layers, so a tighter
    // layer gap keeps a labelled diagram from fitting at a tiny zoom.
    layerSpacing = 56,
  } = options;

  const elk = new ELK();
  const positions = new Map<string, LayoutPosition>();
  const routes = new Map<number, EdgeRoute>();

  if (diagram.elements.length === 0) return { positions, routes };

  // Separate systems (potential parent nodes) from flat elements
  const systems = diagram.elements.filter(
    (el): el is C4System => 'containers' in el && Array.isArray((el as C4System).containers) && ((el as C4System).containers?.length ?? 0) > 0
  );
  const systemIds = new Set(systems.map((s) => s.id));

  // Build the ELK graph
  // For container views, internal systems with containers become group (parent) nodes
  const elkChildren: ElkNode[] = [];
  const allElementIds = new Set<string>();

  for (const el of diagram.elements) {
    allElementIds.add(el.id);

    if (systemIds.has(el.id)) {
      // This system has containers — make it a parent node in ELK
      const sys = el as C4System;
      const containers = sys.containers ?? [];
      const childNodes: ElkNode[] = containers.map((c) => {
        allElementIds.add(c.id);
        const dim = getNodeDimensions(c);
        return {
          id: c.id,
          width: dim.width,
          height: dim.height,
        };
      });

      // Estimate parent size based on child count (ELK will refine it)
      const estWidth = Math.max(280, containers.length * 220 + 60);
      const estHeight = Math.max(200, Math.ceil(containers.length / 2) * 150 + 80);

      elkChildren.push({
        id: el.id,
        width: estWidth,
        height: estHeight,
        children: childNodes,
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': direction,
          'elk.spacing.nodeNode': String(nodeSpacing),
          'elk.layered.spacing.nodeNodeBetweenLayers': String(layerSpacing),
          'elk.padding': '[top=40,left=20,bottom=20,right=20]',
        },
      });
    } else {
      // Flat leaf node
      const dim = getNodeDimensions(el);
      elkChildren.push({
        id: el.id,
        width: dim.width,
        height: dim.height,
      });
    }
  }

  // Map relationships to ELK edges (only between known elements), keyed by the
  // relationship's own index so routes map back to it.
  const elkEdges: ElkExtendedEdge[] = [];
  diagram.relationships.forEach((r, i) => {
    if (!allElementIds.has(r.from) || !allElementIds.has(r.to)) return;
    const text = edgeLabelText(r);
    elkEdges.push({
      id: `edge-${i}`,
      sources: [r.from],
      targets: [r.to],
      ...(text ? { labels: [{ text, ...labelSize(text) }] } : {}),
    });
  });

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': String(nodeSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(layerSpacing),
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: elkChildren,
    edges: elkEdges,
  };

  try {
    const read = readLayout(await elk.layout(graph));
    for (const [id, box] of read.positions) positions.set(id, box);
    for (const [id, e] of read.edges) {
      const index = Number(id.slice('edge-'.length));
      if (Number.isNaN(index)) continue;
      routes.set(index, { points: e.points, ...(e.labels[0] ? { label: e.labels[0] } : {}) });
    }
  } catch (err) {
    console.error('[C4 ELK layout error]', err);
    // Fallback: simple grid layout if ELK fails
    let col = 0;
    let row = 0;
    const cols = Math.ceil(Math.sqrt(diagram.elements.length));
    for (const el of diagram.elements) {
      const dim = getNodeDimensions(el);
      positions.set(el.id, {
        x: col * (dim.width + nodeSpacing),
        y: row * (dim.height + layerSpacing),
        width: dim.width,
        height: dim.height,
      });
      col++;
      if (col >= cols) {
        col = 0;
        row++;
      }
    }
  }

  return { positions, routes };
}

type LaidEdge = ElkExtendedEdge & { container?: string };

/**
 * Absolute boxes for every laid-out node, and each edge's absolute points and label boxes (in the
 * order the labels were given). ELK reports an edge relative to its container; offset it back.
 */
function readLayout(laid: ElkNode): {
  positions: Map<string, LayoutPosition>;
  edges: Map<string, { points: { x: number; y: number }[]; labels: LayoutPosition[] }>;
} {
  const positions = new Map<string, LayoutPosition>();
  const walk = (node: ElkNode, ox: number, oy: number) => {
    for (const child of node.children ?? []) {
      const x = (child.x ?? 0) + ox;
      const y = (child.y ?? 0) + oy;
      positions.set(child.id, {
        x,
        y,
        width: child.width ?? DIMENSIONS.default.width,
        height: child.height ?? DIMENSIONS.default.height,
      });
      walk(child, x, y);
    }
  };
  walk(laid, 0, 0);

  const edges = new Map<string, { points: { x: number; y: number }[]; labels: LayoutPosition[] }>();
  const collect = (node: ElkNode) => {
    for (const e of (node.edges ?? []) as LaidEdge[]) {
      const section = e.sections?.[0];
      if (!section) continue;
      const box = e.container && e.container !== 'root' ? positions.get(e.container) : undefined;
      const ox = box?.x ?? 0;
      const oy = box?.y ?? 0;
      const pts = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
      edges.set(e.id, {
        points: pts.map((p) => ({ x: p.x + ox, y: p.y + oy })),
        labels: (e.labels ?? [])
          .filter((l) => l.x !== undefined && l.y !== undefined)
          .map((l) => ({ x: (l.x ?? 0) + ox, y: (l.y ?? 0) + oy, width: l.width ?? 0, height: l.height ?? 0 })),
      });
    }
    for (const c of node.children ?? []) collect(c);
  };
  collect(laid);
  return { positions, edges };
}

/** A semantic edge's route: its middle label and the port badges at either end, all absolute. */
export interface SemanticRoute {
  points: { x: number; y: number }[];
  label?: LayoutPosition;
  /** Badge by `to` (ELK's head). */
  head?: LayoutPosition;
  /** Badge by `from` (ELK's tail). */
  tail?: LayoutPosition;
}

/** Boundary label row height: ELK leaves it free above the children. */
export const BOUNDARY_TOP = 48;

/**
 * Layout for semantic zoom: every drawn element, nested to any depth. A boundary is an ELK compound
 * sized around its children (never smaller than `minBoundary`, so its label row fits); everything
 * else is a leaf of `sizeOf`. Port badges are ELK end labels, so they sit beside the line right
 * where it meets the boundary, with space reserved.
 */
export async function computeSemanticLayout(
  tree: C4Tree,
  vis: Visibility,
  edges: readonly LiftedEdge[],
  sizeOf: (id: string) => { width: number; height: number },
  minBoundary: (id: string) => { width: number; height: number },
  options: ElkLayoutOptions = {}
): Promise<{ positions: Map<string, LayoutPosition>; routes: Map<string, SemanticRoute> }> {
  const { direction = 'DOWN', nodeSpacing = 60, layerSpacing = 56 } = options;
  const vertical = direction === 'DOWN' || direction === 'UP';
  const drawn = new Set(vis.visible);

  const build = (id: string): ElkNode => {
    if (vis.boundaries.has(id)) {
      const min = minBoundary(id);
      const el = tree.byId.get(id);
      return {
        id,
        layoutOptions: {
          'elk.padding': `[top=${BOUNDARY_TOP},left=24,bottom=24,right=24]`,
          'elk.nodeSize.constraints': 'MINIMUM_SIZE',
          // ELK reads a compound's minimum in its internal left-to-right frame, so
          // for a vertical layout it is (height, width). Measured, elkjs 0.11.
          'elk.nodeSize.minimum': vertical
            ? `(${Math.ceil(min.height)}, ${Math.ceil(min.width)})`
            : `(${Math.ceil(min.width)}, ${Math.ceil(min.height)})`,
        },
        children: (el ? childrenOf(el) : []).filter((c) => drawn.has(c.id)).map((c) => build(c.id)),
      };
    }
    return { id, ...sizeOf(id) };
  };

  const label = (text: string, placement: 'CENTER' | 'HEAD' | 'TAIL') => ({
    text,
    ...labelSize(text),
    ...(placement === 'CENTER' ? {} : { width: labelSize(text).width + 10, layoutOptions: { 'elk.edgeLabels.placement': placement } }),
  });
  const order = new Map<string, ('label' | 'tail' | 'head')[]>();
  const elkEdges: ElkExtendedEdge[] = edges.map((e) => {
    const labels = [];
    const kinds: ('label' | 'tail' | 'head')[] = [];
    if (e.label) (labels.push(label(e.label, 'CENTER')), kinds.push('label'));
    if (e.fromBadge) (labels.push(label(e.fromBadge, 'TAIL')), kinds.push('tail'));
    if (e.toBadge) (labels.push(label(e.toBadge, 'HEAD')), kinds.push('head'));
    order.set(e.key, kinds);
    return { id: e.key, sources: [e.from], targets: [e.to], labels };
  });

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': String(nodeSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(layerSpacing),
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: vis.visible.filter((id) => tree.parent.get(id) === null).map(build),
    edges: elkEdges,
  };

  const read = readLayout(await new ELK().layout(graph));
  const routes = new Map<string, SemanticRoute>();
  for (const [key, e] of read.edges) {
    const route: SemanticRoute = { points: e.points };
    (order.get(key) ?? []).forEach((kind, i) => {
      if (e.labels[i]) route[kind] = e.labels[i];
    });
    routes.set(key, route);
  }
  return { positions: read.positions, routes };
}

/**
 * Determine whether a given C4 element should render as a "group" node in SvelteFlow.
 * A group node is a system that has children containers — it draws a dashed boundary box.
 */
export function isGroupNode(el: C4Element): boolean {
  return 'containers' in el
    && Array.isArray((el as C4System).containers)
    && ((el as C4System).containers?.length ?? 0) > 0;
}

/**
 * Get the SvelteFlow node type string for a C4 element.
 * An explicit `kind` wins; without one the shape is inferred from the fields
 * present, exactly as before `kind` existed.
 */
export function getNodeType(el: C4Element): string {
  if (el.kind) {
    if (el.kind === 'person') return 'person';
    if (isGroupNode(el)) return 'group';
    const sub = 'type' in el ? (el as { type?: string }).type : undefined;
    if (sub === 'database' || sub === 'queue') return sub;
    // `code` (a file, a class) draws as a component node labelled "Code".
    return el.kind === 'code' ? 'component' : el.kind;
  }
  const isPerson = !('technology' in el) && !('type' in el) && !('containers' in el) && !('components' in el);
  if (isPerson) return 'person';

  if (isGroupNode(el)) return 'group';

  const subtype = 'type' in el ? (el as { type?: string }).type : undefined;
  if (subtype === 'database') return 'database';
  if (subtype === 'queue') return 'queue';

  if ('containers' in el) return 'system';
  if ('components' in el) return 'container';

  return 'system';
}
