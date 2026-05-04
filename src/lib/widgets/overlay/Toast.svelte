<!-- src/lib/widgets/overlay/Toast.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { cn } from '$lib/utils.js';
  import type { ToastBus, ToastVariant } from '$lib/core/toast-bus.svelte.js';
  import InfoIcon from '@lucide/svelte/icons/info';
  import CheckIcon from '@lucide/svelte/icons/circle-check';
  import WarnIcon from '@lucide/svelte/icons/triangle-alert';
  import ErrorIcon from '@lucide/svelte/icons/circle-alert';
  import XIcon from '@lucide/svelte/icons/x';

  type Position = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    position?: Position;
    max?: number;
  }

  let { id, class: className, style, position = 'top-right', max = 5 }: Props = $props();

  const bus = getContext<ToastBus | undefined>('ui-toasts');

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const visible = $derived.by(() => {
    const recent = (bus?.toasts ?? []).slice(-max);
    return position.startsWith('top') ? [...recent].reverse() : recent;
  });

  const positionClass = $derived(
    position === 'top-left' ? 'top-4 left-4 items-start'
    : position === 'bottom-right' ? 'bottom-4 right-4 items-end'
    : position === 'bottom-left' ? 'bottom-4 left-4 items-start'
    : 'top-4 right-4 items-end' // default top-right
  );

  function variantIcon(v: ToastVariant) {
    return v === 'success' ? CheckIcon
      : v === 'warning' ? WarnIcon
      : v === 'error' ? ErrorIcon
      : InfoIcon;
  }

  function variantTone(v: ToastVariant) {
    return v === 'success' ? 'text-ripple-success'
      : v === 'warning' ? 'text-ripple-warning'
      : v === 'error' ? 'text-ripple-error'
      : 'text-ripple-info';
  }

  const flyOffset = $derived(position.startsWith('top') ? -16 : 16);
</script>

{#if bus}
  <!-- z-[100] intentionally exceeds the z-50 used by dialogs so toasts stay visible while a modal is open. -->
  <div
    {id}
    class={cn('fixed z-[100] flex flex-col gap-2 pointer-events-none', positionClass, className)}
    style={styleString}
    aria-live="polite"
  >
    {#each visible as toast (toast.id)}
      {@const Icon = variantIcon(toast.variant)}
      <div
        class="pointer-events-auto flex items-start gap-2 rounded-md border border-border bg-ripple-surface px-3 py-2 shadow-lg min-w-[220px] max-w-[360px]"
        aria-atomic="true"
        in:fly={{ y: flyOffset, duration: 200 }}
        out:fade={{ duration: 150 }}
      >
        <span class={cn('mt-0.5', variantTone(toast.variant))}>
          <Icon size={16} />
        </span>
        <p class="text-sm leading-snug flex-1">{toast.message}</p>
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
          onclick={() => bus.dismiss(toast.id)}
        >
          <XIcon size={14} />
        </button>
      </div>
    {/each}
  </div>
{/if}
