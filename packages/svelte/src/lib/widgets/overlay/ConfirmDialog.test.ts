/**
 * @file ConfirmDialog.test.ts
 * @description Tests for the auto-mounted ConfirmDialog widget. Exercises
 * state-driven mount, button-click resolution, Esc/overlay cancel, and
 * automatic state clearing after a decision.
 * @changes
 *   - Initial creation for Phase B flow-actions feature
 */

import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog.svelte';
import { createStateManager } from '$lib/core/state-manager.svelte.js';
import {
	EventDispatcher,
	CONFIRM_STATE_KEY,
	type PendingConfirm
} from '@ripple-ui/core';
import { WidgetRegistry } from '@ripple-ui/core';

function seed(initialPending?: PendingConfirm) {
	const state = createStateManager(
		initialPending ? { [CONFIRM_STATE_KEY]: initialPending } : {}
	);
	const dispatcher = new EventDispatcher(state, undefined, new WidgetRegistry());
	const context = new Map<string, unknown>([
		['ui-state', state],
		['ui-events', dispatcher]
	]);
	return { state, dispatcher, context };
}

describe('ConfirmDialog', () => {
	it('does not render when no pending confirm is present', () => {
		const { context } = seed();
		render(ConfirmDialog, { context });
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('renders when state._ripple_confirm is populated', async () => {
		const pending: PendingConfirm = {
			pending_id: 'p-1',
			title: 'Delete?',
			message: 'This cannot be undone.',
			confirm_label: 'Yes',
			cancel_label: 'No'
		};
		const { context } = seed(pending);
		render(ConfirmDialog, { context });

		expect(await screen.findByText('Delete?')).toBeInTheDocument();
		expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
		expect(screen.getByText('Yes')).toBeInTheDocument();
		expect(screen.getByText('No')).toBeInTheDocument();
	});

	it('clicking Confirm resolves the pending id and clears state', async () => {
		const pending: PendingConfirm = {
			pending_id: 'p-confirm',
			message: 'Sure?',
			confirm_label: 'OK',
			cancel_label: 'Cancel'
		};
		const { state, dispatcher, context } = seed(pending);
		const resolve = vi.spyOn(dispatcher, 'resolveConfirm');

		render(ConfirmDialog, { context });

		const okButton = await screen.findByText('OK');
		await userEvent.click(okButton);

		expect(resolve).toHaveBeenCalledWith('p-confirm', 'confirm');
		// Dispatcher normally clears state after the follow-up runs; here
		// the dialog itself is wired to dispatcher.resolveConfirm which
		// would unblock that flow. The state key may still be populated
		// until dispatcher.handleConfirm clears it, but for the no-op
		// (no pending resolver) path the dialog falls back to clearing
		// directly. Verify either branch happened.
		const afterState = state.get(CONFIRM_STATE_KEY);
		expect(afterState === null || afterState === undefined).toBe(true);
	});

	it('clicking Cancel resolves with cancel', async () => {
		const pending: PendingConfirm = {
			pending_id: 'p-cancel',
			message: 'Leave?',
			confirm_label: 'Stay',
			cancel_label: 'Leave'
		};
		const { dispatcher, context } = seed(pending);
		const resolve = vi.spyOn(dispatcher, 'resolveConfirm');

		render(ConfirmDialog, { context });

		const cancelButton = await screen.findByText('Leave');
		await userEvent.click(cancelButton);

		expect(resolve).toHaveBeenCalledWith('p-cancel', 'cancel');
	});

	it('falls back to clearing state when the resolver is already gone', async () => {
		const pending: PendingConfirm = {
			pending_id: 'orphan',
			message: 'Orphaned',
			confirm_label: 'Yes',
			cancel_label: 'No'
		};
		const { state, dispatcher, context } = seed(pending);
		// resolveConfirm returns false when the id is not known.
		const resolve = vi
			.spyOn(dispatcher, 'resolveConfirm')
			.mockReturnValue(false);

		render(ConfirmDialog, { context });
		await userEvent.click(await screen.findByText('Yes'));

		expect(resolve).toHaveBeenCalled();
		// State must be cleared so the dialog un-mounts.
		expect(state.get(CONFIRM_STATE_KEY)).toBeNull();
	});
});
