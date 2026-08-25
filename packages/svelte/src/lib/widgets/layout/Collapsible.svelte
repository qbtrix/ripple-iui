<!-- src/lib/widgets/layout/Collapsible.svelte
     Updated 2026-06-09 (reactivity): internalOpen seeds once from defaultOpen and is
     then mutated by toggle(), so it must stay $state. The state_referenced_locally
     warning on the seed is an intentional one-time read, suppressed with a directive
     directly above the $state line. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    /** Open state. Bind via `bind: "<state-path>"`. */
    value?: boolean;
    /** Initial open state when uncontrolled. */
    defaultOpen?: boolean;
    /** Hide the chevron indicator on the trigger. */
    hideChevron?: boolean;
    children?: Snippet;
    onchange?: (open: boolean) => void;
  }

  let {
    id,
    class: className,
    style,
    title,
    value,
    defaultOpen = false,
    hideChevron = false,
    children,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // svelte-ignore state_referenced_locally
  let internalOpen = $state(defaultOpen);
  const open = $derived(value !== undefined ? !!value : internalOpen);

  function toggle() {
    const next = !open;
    if (value === undefined) internalOpen = next;
    onchange?.(next);
  }
</script>

<div
  {id}
  class={cn('rounded-md border border-border overflow-hidden', className)}
  style={styleString}
>
  <button
    type="button"
    aria-expanded={open}
    onclick={toggle}
    class="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium hover:bg-muted/40 transition-colors"
  >
    <span class="flex-1 text-left">{title}</span>
    {#if !hideChevron}
      <span class={cn('opacity-60 transition-transform', open && 'rotate-90')}>
        <ChevronRightIcon size={14} />
      </span>
    {/if}
  </button>
  {#if open}
    <div class="border-t border-border px-3 py-2">
      {@render children?.()}
    </div>
  {/if}
</div>
