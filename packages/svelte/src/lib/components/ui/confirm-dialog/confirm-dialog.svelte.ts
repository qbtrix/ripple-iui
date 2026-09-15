/**
 * confirm-dialog.svelte.ts — Programmatic confirm-dialog API.
 *
 * Replaces the browser-native `confirm()` with the application dialog shell
 * (bits-ui via $lib/components/ui/dialog) so every confirmation surface
 * renders the same glass modal instead of a platform alert popup.
 *
 * ## Usage
 * ```ts
 * import { confirmDialog } from "$lib/components/ui/confirm-dialog";
 *
 * const ok = await confirmDialog({
 *   title: "Delete file?",
 *   description: "This cannot be undone.",
 *   confirmText: "Delete",
 *   cancelText: "Cancel",
 *   variant: "destructive",
 * });
 * if (ok) { // delete the resource
 * ```
 *
 * Created 2026-07-20 — replaces window.confirm() across paw-enterprise.
 */

import type { ButtonVariant } from "$lib/components/ui/button";

export type ConfirmDialogOptions = {
	/** Dialog heading (e.g. "Delete file?"). */
	title: string;
	/** Body copy. Can include HTML tags like <strong>. */
	description: string;
	/** Label on the confirmation ("danger") button. Default "Confirm". */
	confirmText?: string;
	/** Label on the cancel button. Default "Cancel". */
	cancelText?: string;
	/** Button variant for the confirm button. Default "destructive". */
	variant?: ButtonVariant;
};

type DialogState = {
	open: boolean;
	options: ConfirmDialogOptions | null;
	resolve: ((value: boolean) => void) | null;
};

let state: DialogState = $state({
	open: false,
	options: null,
	resolve: null,
});

/**
 * Open a confirmation dialog and return a Promise that resolves to
 * `true` when the user confirms, `false` when they cancel or dismiss.
 *
 * Only one dialog can be open at a time — calling `confirmDialog` while
 * another is pending will resolve the first to `false` before opening
 * the new one (the UI never stacks).
 */
export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
	// If a dialog is already open, resolve it as cancelled first.
	if (state.resolve && state.open) {
		const previous = state.resolve;
		state.resolve = null;
		previous(false);
	}

	return new Promise<boolean>((resolve) => {
		state = {
			open: true,
			options: {
				confirmText: "Confirm",
				cancelText: "Cancel",
				variant: "destructive" as ButtonVariant,
				...options,
			},
			resolve,
		};
	});
}

/** Called by the ConfirmDialog component when the user confirms. */
export function _handleConfirm(): void {
	const cb = state.resolve;
	state = { open: false, options: null, resolve: null };
	cb?.(true);
}

/** Called by the ConfirmDialog component when the user cancels or dismisses. */
export function _handleCancel(): void {
	const cb = state.resolve;
	state = { open: false, options: null, resolve: null };
	cb?.(false);
}

/** Reactive read-only access for the ConfirmDialog component. */
export function _getDialogState() {
	return {
		get open() { return state.open; },
		get options() { return state.options; },
	};
}
