// @file widgets/media/index.ts
// @description Barrel for the `media/` widget category — escape-hatch
//   widgets that render rich or third-party content, plus native media players.
// @created 2026-05-22 — Increment 5 (escape-hatch widgets). New category
//   holding ModelViewer (declarative 3D) and Embed (sandboxed iframe).
// @updated 2026-05-31 — composite consumer widgets migration. Added
//   AudioPlayer and VideoPlayer (native HTMLAudioElement / HTMLVideoElement)
//   ported from the ocean-flow genesis composite set.
export { default as ModelViewer } from './ModelViewer.svelte';
export { default as Embed } from './Embed.svelte';
export { default as AudioPlayer } from './AudioPlayer.svelte';
export { default as VideoPlayer } from './VideoPlayer.svelte';
