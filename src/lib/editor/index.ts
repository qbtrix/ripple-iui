/**
 * @file editor/index.ts
 * @description Public barrel for the Ripple visual editor, exported as
 *   `@ripple-ui/svelte/editor`. Re-exports the L1 core (geometry, `BoundsIndex`
 *   + resolvers, `SelectionModel`, the editable-prop policy, and the one-op
 *   apply seam) and the L2 Svelte layer (`RippleEditorOverlay`,
 *   `RippleInlineEditor`, `EditorSelection`). SP-1a ships selection + overlay;
 *   SP-1b adds inline + inspector editing through the `EditorOps` seam; SP-1c
 *   (drag / persistence) attaches to the same `SelectionModel` + `BoundsIndex` +
 *   `EditorOps.onApplied` seams.
 * @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
 * @changes 2026-06-27 (SP-1b): export RippleInlineEditor (inline text edit).
 * @changes 2026-06-29 (editor chrome): export RippleInspector (manifest-driven
 *   properties panel) + the inspector-fields L1 helpers (via core barrel).
 * @changes 2026-06-30 (editor chrome PIECE 2): export RippleDragLayer (drag-to-
 *   reorder) + the drag-reorder L1 helpers (via core barrel).
 * @changes 2026-06-30 (EP-1): the LaneAdapter port + RippleLaneAdapter are exported
 *   through the core barrel (`export * from './core/index.js'`); the inspector is
 *   migrated onto the port.
 * @changes 2026-06-30 (EP-2): the remaining chrome (RippleEditorOverlay,
 *   RippleInlineEditor, RippleDragLayer) is migrated onto the LaneAdapter port —
 *   each now takes an `adapter` prop and no longer reaches into resolveElementToNodeId
 *   / EditorOps / spec-mutator directly. Public exports are unchanged.
 * @changes 2026-06-30 (EP-3): the pluggable InlineEditor slot (interface + registry +
 *   the ContentEditable / TipTap ripple impls) is exported through the core barrel
 *   (`export * from './core/index.js'`); RippleInlineEditor now delegates mounting to it.
 * @changes 2026-06-30 (EP-4): the SOURCE-FIDELITY InlineEditor (no-dep, byte-stable,
 *   in-place; registered under the 'overlay' kind for the future svelte source lane) is
 *   exported through the core barrel; the controller is UNCHANGED (it resolves 'overlay'
 *   from the registry).
 */
export * from './core/index.js';
export { default as RippleEditorOverlay } from './RippleEditorOverlay.svelte';
export { default as RippleInlineEditor } from './RippleInlineEditor.svelte';
export { default as RippleInspector } from './RippleInspector.svelte';
export { default as RippleDragLayer } from './RippleDragLayer.svelte';
export { EditorSelection, createEditorSelection } from './editor-selection.svelte.js';
