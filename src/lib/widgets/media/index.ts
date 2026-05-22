// @file widgets/media/index.ts
// @description Barrel for the `media/` widget category — escape-hatch
//   widgets that render rich or third-party content.
// @created 2026-05-22 — Increment 5 (escape-hatch widgets). New category
//   holding ModelViewer (declarative 3D) and Embed (sandboxed iframe).
export { default as ModelViewer } from './ModelViewer.svelte';
export { default as Embed } from './Embed.svelte';
