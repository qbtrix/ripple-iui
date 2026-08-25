<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Sheet from '$lib/components/ui/sheet/index.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Whether the sheet is open. Bind to state for controlled open/close. */
    open?: boolean;
    /** Alias for `open` — Ripple's `bind` writes to `value`, so accept it here too. */
    value?: boolean;
    /** Side the sheet slides in from. */
    side?: 'top' | 'right' | 'bottom' | 'left';
    title?: string;
    description?: string;
    children?: Snippet;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style, open, value, side = 'right',
    title, description, children, onchange
  }: Props = $props();

  const isOpen = $derived(open ?? value ?? false);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function handleOpenChange(v: boolean) {
    onchange?.(v);
  }
</script>

<Sheet.Root open={isOpen} onOpenChange={handleOpenChange}>
  <Sheet.Content
    {id}
    {side}
    class={cn(className)}
    style={styleString}
  >
    {#if title || description}
      <Sheet.Header>
        {#if title}<Sheet.Title>{title}</Sheet.Title>{/if}
        {#if description}<Sheet.Description>{description}</Sheet.Description>{/if}
      </Sheet.Header>
    {/if}
    <div class="px-4 pb-4">
      {@render children?.()}
    </div>
  </Sheet.Content>
</Sheet.Root>
