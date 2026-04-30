/**
 * @file overlay/index.ts
 * @description Barrel export for overlay widgets (confirm dialogs, etc.).
 * @changes
 *   - Initial creation alongside ConfirmDialog for Phase B flow-actions
 */
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
export { default as Alert } from './Alert.svelte';
export { default as DropdownMenu } from './DropdownMenu.svelte';
export { default as Toast } from './Toast.svelte';
export { default as Tooltip } from './Tooltip.svelte';
