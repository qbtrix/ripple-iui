<!--
  @file ConfirmDialog.svelte
  @description Auto-mounted dialog that renders pending `confirm` actions
  written to `state._ripple_confirm` by the event dispatcher. On button
  click, the dialog calls the dispatcher's `resolveConfirm(pending_id,
  decision)` to resume the suspended flow.
  @changes
    - Initial creation for Phase B flow-actions feature
-->
<script lang="ts">
  import { getContext } from 'svelte';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';
  import type { EventDispatcher, PendingConfirm } from '$lib/core/event-dispatcher.js';
  import { CONFIRM_STATE_KEY } from '$lib/core/event-dispatcher.js';

  const stateManager = getContext<StateManager | undefined>('ui-state');
  const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');

  // Derived from state — reactive whenever the dispatcher writes.
  const pending = $derived.by<PendingConfirm | null>(() => {
    if (!stateManager) return null;
    const raw = stateManager.state[CONFIRM_STATE_KEY] as unknown;
    if (!raw || typeof raw !== 'object') return null;
    const candidate = raw as PendingConfirm;
    if (!candidate.pending_id || !candidate.message) return null;
    return candidate;
  });

  const isOpen = $derived(pending !== null);

  function handleDecision(decision: 'confirm' | 'cancel') {
    if (!eventDispatcher || !pending) return;
    const resolved = eventDispatcher.resolveConfirm(pending.pending_id, decision);
    if (!resolved && stateManager) {
      // Registry may have been cleared (HMR, stale dialog) — fall back to
      // clearing the state so the UI unblocks.
      stateManager.set(CONFIRM_STATE_KEY, null);
    }
  }

  function handleOpenChange(open: boolean) {
    // Treat overlay / Esc dismissal the same as Cancel so flows never hang.
    if (!open && pending) {
      handleDecision('cancel');
    }
  }
</script>

{#if pending}
  <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
    <Dialog.Content class="sm:max-w-md" data-ripple-confirm-dialog>
      <Dialog.Header>
        {#if pending.title}
          <Dialog.Title>{pending.title}</Dialog.Title>
        {/if}
        <Dialog.Description>{pending.message}</Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer class="gap-2 sm:justify-end">
        <Button
          variant="outline"
          onclick={() => handleDecision('cancel')}
          data-ripple-confirm-cancel
        >
          {pending.cancel_label}
        </Button>
        <Button
          onclick={() => handleDecision('confirm')}
          data-ripple-confirm-ok
        >
          {pending.confirm_label}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
{/if}
