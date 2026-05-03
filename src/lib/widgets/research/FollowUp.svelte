<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { getContext } from 'svelte';
  import type { EventDispatcher } from '$lib/core/event-dispatcher.js';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';

  interface Props {
    /** Input placeholder text */
    placeholder?: string;
    /** Submit button label (sr-only) */
    submitLabel?: string;
    /** Emit event name on submit */
    event?: string;
    class?: string;
    onsubmit?: (e?: unknown) => void;
  }

  let {
    placeholder = 'Ask follow-up',
    submitLabel = 'Send',
    event = 'follow-up',
    class: className, onsubmit
  }: Props = $props();

  let value = $state('');
  const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
  const stateManager = getContext<StateManager | undefined>('ui-state');

  function handleSubmit() {
    const text = value.trim();
    if (!text) return;
    if (onsubmit) {
      onsubmit(text);
    } else {
      eventDispatcher?.dispatch(
        { action: 'emit', target: event, value: text },
        { state: stateManager?.state ?? {} }, undefined
      );
    }
    value = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }
</script>

<div class={cn('rfollow', className)}>
  <input
    type="text"
    class="rfollow-input"
    {placeholder}
    bind:value
    onkeydown={handleKeydown}
  />
  <button
    class="rfollow-btn"
    onclick={handleSubmit}
    disabled={!value.trim()}
    title={submitLabel}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  </button>
</div>

<style>
  .rfollow {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--card);
    transition: border-color 0.15s;
  }
  .rfollow:focus-within {
    border-color: color-mix(in oklab, var(--primary) 50%, transparent);
  }
  .rfollow-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
    color: var(--foreground);
    font-family: inherit;
  }
  .rfollow-input::placeholder {
    color: color-mix(in oklab, var(--muted-foreground) 60%, transparent);
  }
  .rfollow-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: none;
    background: var(--primary);
    color: var(--primary-foreground);
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.15s;
  }
  .rfollow-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .rfollow-btn:not(:disabled):hover {
    opacity: 0.85;
  }
</style>
