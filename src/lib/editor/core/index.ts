/**
 * @file editor/core/index.ts
 * @description Barrel for the editor L1 core (PURE TS, zero Svelte/rune imports):
 *   geometry math, the DOM-id `BoundsIndex` + element resolver, the
 *   framework-agnostic `SelectionModel`, the catalog-derived editable-prop
 *   policy (`editable.ts`), and the one-op apply seam (`editor-ops.ts`).
 *   Re-exported by the editor L2 barrel (`../index.ts`) under the
 *   `@ripple-ui/svelte/editor` package entry.
 * @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
 * @changes 2026-06-27 (SP-1b): export findNodeElement, editable.ts, editor-ops.ts.
 */
export { pointInRect, rectToStyle, rectArea, relativeRect, type Rect } from './geometry.js';
export {
  BoundsIndex,
  buildBoundsIndex,
  findNodeElement,
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
export {
  TEXT_PROP_PRIORITY,
  resolvePrimaryTextProp,
  resolveEditableTextProps,
  primaryTextProp,
  editableTextProps,
  catalogEntry,
  INLINE_TEXT_WIDGETS,
  isInlineTextWidget,
  normalizeInlineText,
  type CatalogPropSpec,
  type CatalogEntryLike
} from './editable.js';
export {
  createEditorOps,
  nodePropSet,
  type EditorOp,
  type EditorOps,
  type EditorOpsOptions
} from './editor-ops.js';
