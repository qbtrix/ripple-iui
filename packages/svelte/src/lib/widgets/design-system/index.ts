/**
 * @file widgets/design-system/index.ts
 * @description Barrel for the SP-3 design-system widget pack: the token-editor
 *   widget (`DesignSystemEditor`) plus the starter BrandPacks. Registered in the
 *   widget map under `design-system` and exported from the package so a host can
 *   mount `<DesignSystemEditor brand onChange>` directly.
 * @created 2026-06-28 — SP-3 chunk 11.
 */
export { default as DesignSystemEditor } from './DesignSystemEditor.svelte';
export { defaultBrandPack, emptyBrandPack } from './brand-defaults.js';
