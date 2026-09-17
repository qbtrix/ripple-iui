// confirm-dialog/index.ts — ConfirmDialog composable namespace. Added 2026-09-14 (ripple overlay
// canonical): copied from paw-enterprise, re-tokened to ripple surface tokens,
// store specifier changed .svelte.ts -> .svelte.js so the emitted .d.ts resolves,
// exported through `@ripple-ui/svelte/ui`.
export { default as ConfirmDialog } from "./confirm-dialog.svelte";
export { confirmDialog, type ConfirmDialogOptions } from "./confirm-dialog.svelte.js";
