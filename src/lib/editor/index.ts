/**
 * @file editor/index.ts
 * @description Public barrel for the Ripple visual editor, exported as
 *   `@ripple-ui/svelte/editor`. Re-exports the L1 core (geometry, `BoundsIndex`
 *   + resolvers, `SelectionModel`) and the L2 Svelte layer
 *   (`RippleEditorOverlay`, `EditorSelection`). SP-1a ships selection + overlay;
 *   SP-1b (inline edit) and SP-1c (drag) attach to the same `SelectionModel` +
 *   `BoundsIndex` seams.
 * @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
 */
export * from './core/index.js';
export { default as RippleEditorOverlay } from './RippleEditorOverlay.svelte';
export { EditorSelection, createEditorSelection } from './editor-selection.svelte.js';
