// @file widgets/interactive/index.ts
// @description Barrel for the `interactive/` widget category — self-contained
//   consumer widgets with local interaction state (no data backend).
// @created 2026-05-31 — composite consumer widgets migration. New category
//   holding TodoList, DrawingCanvas, Timer, and Flashcard, ported from the
//   ocean-flow genesis composite set into Ripple conventions.
export { default as TodoList } from './TodoList.svelte';
export { default as DrawingCanvas } from './DrawingCanvas.svelte';
export { default as Timer } from './Timer.svelte';
export { default as Flashcard } from './Flashcard.svelte';
