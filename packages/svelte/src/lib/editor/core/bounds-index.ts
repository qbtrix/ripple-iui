/**
 * @file editor/core/bounds-index.ts
 * @description L1 (PURE TS, zero Svelte/rune imports) DOM-id addressability for
 *   the Ripple visual-editor overlay. Two layers, deliberately separated so the
 *   logic is unit-testable without a real browser:
 *
 *   1. PURE resolution / math (testable with synthetic rects & jsdom elements):
 *      - `BoundsIndex.resolvePoint`   point -> innermost node id over a Rect map.
 *      - `resolveElementToNodeId`     clicked/hovered element -> node id, walking
 *        UP to the nearest id-bearing ancestor. This is the SELECT-PARENT
 *        fallback for the ~15% of widget roots that don't forward `id`
 *        (badge / metric / table / chart / progress / research/*) — see
 *        docs/design/sp0-spike-report.md.
 *      - `nodeIdOf`                   read a single element's node id.
 *
 *   2. THIN DOM BOUNDARY (one function): `buildBoundsIndex(container)` queries
 *      `[id],[data-ripple-node]`, reads getBoundingClientRect, and builds an
 *      id -> container-relative Rect map. jsdom returns ZERO rects, so tests
 *      assert the id SET this finds, not pixel positions — overlay box geometry
 *      is deferred to browser confirmation.
 *
 *   Primary selector is the DOM `id` (SP-0 GO-WITH-FALLBACK, ~85% of widgets);
 *   `data-ripple-node` is the dedicated-attribute path (motion wrappers today).
 * @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
 */
import { isValidNodeId } from '@ripple-ui/core';
import { pointInRect, rectArea, relativeRect, type Rect } from './geometry.js';

/** Attribute the renderer stamps with `node.id` (NodeRenderer SP-0 stamp). */
export const RIPPLE_NODE_ATTR = 'data-ripple-node';

/** Elements that may carry a node id: an explicit `id` or the dedicated attr. */
export const NODE_ID_SELECTOR = `[id],[${RIPPLE_NODE_ATTR}]`;

export interface ResolveOptions {
  /** Node ids known from the spec tree — the precise allow-list. */
  knownIds?: Set<string> | null;
  /**
   * Override id recognition entirely. Default: membership in `knownIds` when
   * provided, otherwise the ripple `n_xxxxxxxx` id format (`isValidNodeId`).
   */
  isNodeId?: (id: string) => boolean;
  /**
   * Stop the ancestor walk when this element is reached (EXCLUSIVE). Typically
   * the render container, so the walk never escapes into the host/stage chrome.
   */
  boundary?: Element | null;
}

function recognizer(opts: ResolveOptions | undefined): (id: string) => boolean {
  if (opts?.isNodeId) return opts.isNodeId;
  const known = opts?.knownIds;
  if (known) return (id: string) => known.has(id);
  return (id: string) => isValidNodeId(id);
}

/**
 * Read the node id carried by a SINGLE element. `data-ripple-node` is our own
 * stamp (always a node id) and wins; otherwise an `id` the recognizer accepts.
 * Returns null when the element carries no recognized node id.
 */
export function nodeIdOf(el: Element, opts?: ResolveOptions): string | null {
  const stamped = el.getAttribute(RIPPLE_NODE_ATTR);
  if (stamped) return stamped;
  const id = el.id;
  if (id && recognizer(opts)(id)) return id;
  return null;
}

/**
 * Resolve a clicked/hovered element to its node id, walking up to the nearest
 * id-bearing ancestor (SELECT-PARENT). Returns null if no node id is found
 * before the boundary (exclusive) or the document root.
 */
export function resolveElementToNodeId(
  target: Element | null,
  opts?: ResolveOptions
): string | null {
  const boundary = opts?.boundary ?? null;
  let el: Element | null = target;
  while (el && el !== boundary) {
    const id = nodeIdOf(el, opts);
    if (id) return id;
    el = el.parentElement;
  }
  return null;
}

/** id -> container-relative Rect, with an innermost-hit point resolver. */
export class BoundsIndex {
  #map: Map<string, Rect>;

  constructor(map?: Map<string, Rect>) {
    this.#map = map ?? new Map();
  }

  get size(): number {
    return this.#map.size;
  }

  ids(): string[] {
    return [...this.#map.keys()];
  }

  get(id: string): Rect | undefined {
    return this.#map.get(id);
  }

  has(id: string): boolean {
    return this.#map.has(id);
  }

  /** Innermost (smallest-area) node whose rect contains (x, y); null if none. */
  resolvePoint(x: number, y: number): string | null {
    let bestId: string | null = null;
    let bestArea = Infinity;
    for (const [id, rect] of this.#map) {
      if (!pointInRect(rect, x, y)) continue;
      const area = rectArea(rect);
      if (area < bestArea) {
        bestArea = area;
        bestId = id;
      }
    }
    return bestId;
  }
}

/**
 * THIN DOM BOUNDARY. Build an id -> container-relative Rect index by querying
 * the container's id/attr-bearing descendants and measuring each. The FIRST
 * match per id wins (document order = outermost), so a motion-wrapped node maps
 * to its wrapper, not the inner widget that repeats the id.
 *
 * jsdom returns zero rects; the measurement is correct in a real browser. Tests
 * assert the id SET, not positions (see the file header).
 */
export function buildBoundsIndex(container: HTMLElement, opts?: ResolveOptions): BoundsIndex {
  const map = new Map<string, Rect>();
  const originRect = container.getBoundingClientRect();
  const origin = { left: originRect.left, top: originRect.top };
  for (const el of container.querySelectorAll(NODE_ID_SELECTOR)) {
    const id = nodeIdOf(el, opts);
    if (!id || map.has(id)) continue;
    map.set(id, relativeRect(el.getBoundingClientRect(), origin));
  }
  return new BoundsIndex(map);
}

/**
 * THIN DOM BOUNDARY. Find the FIRST element in `container` (document order =
 * outermost) carrying node `id` — by the dedicated `data-ripple-node` stamp or a
 * recognized DOM `id`. Used by the inline editor (SP-1b) to target the element
 * to make contenteditable, and by SP-1c for drag handles. Returns null when no
 * such element exists (e.g. a non-id-forwarding widget that only select-parents).
 */
export function findNodeElement(
  container: HTMLElement,
  id: string,
  opts?: ResolveOptions
): HTMLElement | null {
  for (const el of container.querySelectorAll(NODE_ID_SELECTOR)) {
    if (nodeIdOf(el, opts) === id) return el as HTMLElement;
  }
  return null;
}
