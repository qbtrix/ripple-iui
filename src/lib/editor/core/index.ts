/**
 * @file editor/core/index.ts
 * @description Barrel for the editor L1 core (PURE TS, zero Svelte/rune imports):
 *   geometry math, the DOM-id `BoundsIndex` + element resolver, and the
 *   framework-agnostic `SelectionModel`. Re-exported by the editor L2 barrel
 *   (`../index.ts`) under the `@ripple-ui/svelte/editor` package entry.
 * @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
 */
export { pointInRect, rectToStyle, rectArea, relativeRect, type Rect } from './geometry.js';
export {
  BoundsIndex,
  buildBoundsIndex,
  resolveElementToNodeId,
  nodeIdOf,
  RIPPLE_NODE_ATTR,
  NODE_ID_SELECTOR,
  type ResolveOptions
} from './bounds-index.js';
export {
  SelectionModel,
  createSelectionModel,
  type SelectionState,
  type SelectionListener
} from './selection-model.js';
