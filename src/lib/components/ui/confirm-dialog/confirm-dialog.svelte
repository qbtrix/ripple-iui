<script lang="ts">
	/**
	 * ConfirmDialog.svelte — Application-wide confirmation modal.
	 *
	 * Renders a single bits-ui Dialog driven by the reactive store in
	 * confirm-dialog.svelte.ts. Mount once at the app root (e.g. +layout.svelte);
	 * open from anywhere via `await confirmDialog({...})`.
	 *
	 * Created 2026-07-20.
	 */
	import * as Dialog from "$lib/components/ui/dialog";
	import { Button } from "$lib/components/ui/button";
	import { _handleConfirm, _handleCancel, _getDialogState } from "./confirm-dialog.svelte.ts";

	const dialogState = _getDialogState();
</script>

<Dialog.Root open={dialogState.open} onOpenChange={(open) => { if (!open) _handleCancel(); }}>
	<Dialog.Content class="sm:max-w-[400px]">
		<Dialog.Header>
			<Dialog.Title>
				{dialogState.options?.title ?? ""}
			</Dialog.Title>
			<!-- eslint-disable svelte/no-at-html-tags -- description content comes from internal developer code, not raw user input -->
			<Dialog.Description>
				{#if dialogState.options?.description}
					{@html dialogState.options.description}
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="ghost" onclick={_handleCancel}>
				{dialogState.options?.cancelText ?? "Cancel"}
			</Button>
			<Button
				variant={dialogState.options?.variant ?? "destructive"}
				onclick={_handleConfirm}
				data-testid="confirm-dialog-confirm"
			>
				{dialogState.options?.confirmText ?? "Confirm"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
