<!-- Created: 2026-04-16 — Modal widget wrapping shadcn Dialog primitive.
     Updated: 2026-04-21 — opts into the WidgetRegistry when `id` is set so
     the `invoke` flow action can call `open` / `close` remotely.
     Opens/closes via state-bound `value` prop (maps to dialog `open`).
     Props: title, description, size ("sm"|"md"|"lg"). Supports children.
     Dismissal (overlay click / Esc) emits onchange(false) to sync state. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import type { WidgetRegistry } from '$lib/core/widget-registry.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Controlled open state — NodeRenderer injects this via `bind` as `value` */
    value?: boolean;
    title?: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg';
    children?: Snippet;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style,
    value = false,
    title, description,
    size = 'md',
    children,
    onchange
  }: Props = $props();

  // Local open state that syncs with incoming `value` prop
  let isOpen = $state(value ?? false);

  $effect(() => {
    isOpen = value ?? false;
  });

  // Opt in to the widget registry so flow `invoke` can open/close this modal.
  const widgetRegistry = getContext<WidgetRegistry | undefined>('ui-widget-registry');
  $effect(() => {
    if (!id || !widgetRegistry) return;
    const offOpen = widgetRegistry.register(id, 'open', () => {
      isOpen = true;
      onchange?.(true);
    });
    const offClose = widgetRegistry.register(id, 'close', () => {
      isOpen = false;
      onchange?.(false);
    });
    return () => {
      offOpen();
      offClose();
    };
  });

  const sizeClass = $derived({
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg'
  }[size ?? 'md']);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function handleOpenChange(open: boolean) {
    isOpen = open;
    // Emit false when dialog closes so the bound state path gets updated
    if (!open) {
      onchange?.(false);
    }
  }
</script>

<Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
  <Dialog.Content
    {id}
    class={cn(sizeClass, className)}
    style={styleString}
  >
    {#if title || description}
      <Dialog.Header>
        {#if title}
          <Dialog.Title>{title}</Dialog.Title>
        {/if}
        {#if description}
          <Dialog.Description>{description}</Dialog.Description>
        {/if}
      </Dialog.Header>
    {/if}
    {@render children?.()}
  </Dialog.Content>
</Dialog.Root>
