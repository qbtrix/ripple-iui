// C4 diagram auto-layout — grid-based positioning for C4 elements
// Created: Grid layout algorithm that places main system center, externals on perimeter

import type { C4Element, C4Relationship, LayoutNode } from './types.js';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 120;
const PERSON_WIDTH = 160;
const PERSON_HEIGHT = 140;
const DB_WIDTH = 180;
const DB_HEIGHT = 130;
const GAP_X = 80;
const GAP_Y = 80;

/** Check if an element is a "person" (has no technology field, has external flag or description only) */
function isPerson(el: C4Element): boolean {
  return !('technology' in el) && !('type' in el) && !('containers' in el) && !('components' in el);
}

/** Check if an element is external */
function isExternal(el: C4Element): boolean {
  return 'external' in el && el.external === true;
}

/** Check if an element is a database */
function isDatabase(el: C4Element): boolean {
  return 'type' in el && (el as { type?: string }).type === 'database';
}

/** Get dimensions for an element */
function getDimensions(el: C4Element): { width: number; height: number } {
  if (isPerson(el)) return { width: PERSON_WIDTH, height: PERSON_HEIGHT };
  if (isDatabase(el)) return { width: DB_WIDTH, height: DB_HEIGHT };
  return { width: NODE_WIDTH, height: NODE_HEIGHT };
}

/**
 * Grid-based auto-layout for C4 diagrams.
 *
 * Strategy:
 * - External persons go on top row
 * - Internal systems/containers in the center area (grid)
 * - External systems go on the bottom row
 *
 * Elements are sorted by relationship connectivity to minimize arrow crossings.
 */
export function autoLayout(
  elements: C4Element[],
  relationships: C4Relationship[]
): Map<string, LayoutNode> {
  const result = new Map<string, LayoutNode>();

  if (elements.length === 0) return result;

  // Classify elements
  const externalPersons: C4Element[] = [];
  const internalElements: C4Element[] = [];
  const externalSystems: C4Element[] = [];

  for (const el of elements) {
    if (isPerson(el) && isExternal(el)) {
      externalPersons.push(el);
    } else if (isExternal(el)) {
      externalSystems.push(el);
    } else {
      internalElements.push(el);
    }
  }

  // Sort internal elements by connectivity (most connected first, center)
  const connectionCount = new Map<string, number>();
  for (const rel of relationships) {
    connectionCount.set(rel.from, (connectionCount.get(rel.from) ?? 0) + 1);
    connectionCount.set(rel.to, (connectionCount.get(rel.to) ?? 0) + 1);
  }

  internalElements.sort((a, b) => {
    const ca = connectionCount.get(a.id) ?? 0;
    const cb = connectionCount.get(b.id) ?? 0;
    return cb - ca; // Most connected first
  });

  // Compute total width for centering rows
  const computeRowWidth = (items: C4Element[]): number => {
    if (items.length === 0) return 0;
    return items.reduce((w, el) => w + getDimensions(el).width, 0) + (items.length - 1) * GAP_X;
  };

  // All rows widths
  const topRowWidth = computeRowWidth(externalPersons);
  const internalCols = Math.min(internalElements.length, Math.max(2, Math.ceil(Math.sqrt(internalElements.length))));
  const internalRows = Math.ceil(internalElements.length / internalCols);

  // Internal grid width
  const internalGridWidth = internalCols * (NODE_WIDTH + GAP_X) - GAP_X;
  const bottomRowWidth = computeRowWidth(externalSystems);

  const maxWidth = Math.max(topRowWidth, internalGridWidth, bottomRowWidth, NODE_WIDTH);

  let currentY = 0;

  // Place external persons (top row, centered)
  if (externalPersons.length > 0) {
    let startX = (maxWidth - topRowWidth) / 2;
    for (const el of externalPersons) {
      const dim = getDimensions(el);
      result.set(el.id, {
        id: el.id,
        x: startX,
        y: currentY,
        width: dim.width,
        height: dim.height,
      });
      startX += dim.width + GAP_X;
    }
    currentY += PERSON_HEIGHT + GAP_Y * 1.5;
  }

  // Place internal elements (center grid)
  if (internalElements.length > 0) {
    const gridStartX = (maxWidth - internalGridWidth) / 2;
    for (let i = 0; i < internalElements.length; i++) {
      const col = i % internalCols;
      const row = Math.floor(i / internalCols);
      const el = internalElements[i];
      const dim = getDimensions(el);

      result.set(el.id, {
        id: el.id,
        x: gridStartX + col * (NODE_WIDTH + GAP_X) + (NODE_WIDTH - dim.width) / 2,
        y: currentY + row * (NODE_HEIGHT + GAP_Y),
        width: dim.width,
        height: dim.height,
      });
    }
    currentY += internalRows * (NODE_HEIGHT + GAP_Y) + GAP_Y * 0.5;
  }

  // Place external systems (bottom row, centered)
  if (externalSystems.length > 0) {
    let startX = (maxWidth - bottomRowWidth) / 2;
    for (const el of externalSystems) {
      const dim = getDimensions(el);
      result.set(el.id, {
        id: el.id,
        x: startX,
        y: currentY,
        width: dim.width,
        height: dim.height,
      });
      startX += dim.width + GAP_X;
    }
  }

  return result;
}
