// elk-layout.ts — ELK.js-based auto-layout for C4 diagrams
// Created: 2026-04-07 — Replaces grid-based layout.ts with professional ELK layered layout

import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { C4Diagram, C4Element, C4System, C4Container } from './types.js';

const elk = new ELK();

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

/** Determine ELK node dimensions for a given C4 element */
function getNodeDimensions(el: C4Element): { width: number; height: number } {
  // Person: has no technology, type, containers, or components
  const isPerson = !('technology' in el) && !('type' in el) && !('containers' in el) && !('components' in el);
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
  const {
    direction = 'DOWN',
    nodeSpacing = 60,
    layerSpacing = 80,
  } = options;

  const positions = new Map<string, LayoutPosition>();

  if (diagram.elements.length === 0) return positions;

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

  // Map relationships to ELK edges (only between known elements)
  const elkEdges: ElkExtendedEdge[] = diagram.relationships
    .filter((r) => allElementIds.has(r.from) && allElementIds.has(r.to))
    .map((r, i) => ({
      id: `edge-${i}`,
      sources: [r.from],
      targets: [r.to],
    }));

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
    const laid = await elk.layout(graph);

    // Extract positions from result — traverse children recursively
    function extractPositions(node: ElkNode & { children?: ElkNode[] }, offsetX = 0, offsetY = 0) {
      if (node.id !== 'root') {
        const x = (node.x ?? 0) + offsetX;
        const y = (node.y ?? 0) + offsetY;
        positions.set(node.id, {
          x,
          y,
          width: node.width ?? DIMENSIONS.default.width,
          height: node.height ?? DIMENSIONS.default.height,
        });
        // Recurse into children using the parent's position as offset
        if (node.children) {
          for (const child of node.children) {
            extractPositions(child, x, y);
          }
        }
      } else {
        // Root node — just recurse with no offset
        if (node.children) {
          for (const child of node.children) {
            extractPositions(child, 0, 0);
          }
        }
      }
    }

    extractPositions(laid);
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

  return positions;
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
 */
export function getNodeType(el: C4Element): string {
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
