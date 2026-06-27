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
 */
export * from './core/index.js';
export { default as RippleEditorOverlay } from './RippleEditorOverlay.svelte';
export { default as RippleInlineEditor } from './RippleInlineEditor.svelte';
export { EditorSelection, createEditorSelection } from './editor-selection.svelte.js';
