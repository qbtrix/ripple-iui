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
 * @changes 2026-06-27 (SP-1c-a): export ports.ts (host-boundary interfaces) +
 *   MemoryPersistenceAdapter (in-memory reference stub).
 * @changes 2026-06-30 (EP-1): export the LaneAdapter port (lane-adapter.ts) + the
 *   ripple implementation (RippleLaneAdapter).
 * @changes 2026-06-30 (EP-3): export the pluggable InlineEditor slot (inline-editor.ts:
 *   the interface, registry, and the two ripple impls — ContentEditable + TipTap).
 * @changes 2026-06-30 (EP-4): export the SOURCE-FIDELITY InlineEditor impl
 *   (inline-editor-source.ts) — the no-dep, byte-stable, in-place editor registered
 *   under the 'overlay' kind for the future svelte source lane. The re-export
 *   evaluates the module, so its self-registration side effect runs for any barrel
 *   consumer (`resolveInlineEditor('overlay')`).
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
  RICH_TEXT_PROP,
  RICH_TEXT_WIDGETS,
  isRichTextWidget,
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
export {
  type PersistenceAdapter,
  type DataSourceAdapter,
  type ExportStorageAdapter,
  type AuthoringAgentAdapter,
  type ScopeId,
  type DraftRef,
  type Revision
} from './ports.js';
export { MemoryPersistenceAdapter } from './memory-persistence-adapter.js';
export {
  inferFields,
  inferFieldKind,
  parseEnumOptions,
  coerceFieldValue,
  inspectorCatalogEntry,
  type InspectorField,
  type FieldKind
} from './inspector-fields.js';
export {
  resolveSiblingDrop,
  siblingResolverFromRoot,
  nodeMovedOp,
  type ParentAndSiblings,
  type SiblingResolver,
  type DropTarget
} from './drag-reorder.js';
export {
  type LaneAdapter,
  type TargetRef,
  type EditableNode,
  type EditOp
} from './lane-adapter.js';
export { RippleLaneAdapter, type RippleLaneAdapterOptions } from './ripple-lane-adapter.js';
export {
  registerInlineEditor,
  resolveInlineEditor,
  type InlineEditor,
  type InlineEditorHandle,
  type InlineEditorMountOpts
} from './inline-editor.js';
export { ContentEditableInlineEditor } from './inline-editor-contenteditable.js';
export { TipTapInlineEditor } from './inline-editor-tiptap.js';
export { SourceFidelityInlineEditor } from './inline-editor-source.js';
