<!--
  Updated 2026-07-08: typed getIcon's Lucide lookup as a Svelte Component (was unknown → narrowed to {} at the render slot, failing svelte-check).
  Updated 2026-09-12: the children branch gates on `children` alone, not
  `hasChildren && children`, so a hand-written Svelte caller that passes
  children renders them. Gating on `hasChildren` here would drop the
  fallback branch below; NodeRenderer now only passes `children` when the
  spec node actually has default kids, which makes the snippet truthful.
  2026-09-17 (fix/port-gaps): status-coloured text moved onto the readable
  text tokens (text-ripple-{error,success,warning,info}-text; red text that
  read text-destructive now reads text-ripple-error-text, the same hue since
  --ripple-error aliases --destructive). The raw tones are fill colours and
  measured 1.7-3.3:1 as text in light mode. Fills and tints are unchanged.
-->
<!-- src/lib/widgets/overlay/ContextMenu.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ContextMenu as CM } from 'bits-ui';
  import { cn } from '$lib/utils.js';
  import * as icons from '@lucide/svelte';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';

  type Item = {
    label?: string;
    icon?: string;
    value?: string;
    variant?: 'default' | 'destructive';
    disabled?: boolean;
    type?: 'separator' | 'item';
    shortcut?: string;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    items?: Item[];
    /** Spec rendered as the right-clickable target. */
    trigger?: any;
    children?: Snippet;
    hasChildren?: boolean;
    onchange?: (value?: unknown) => void;
  }

  let {
    id,
    class: className,
    style,
    items = [],
    trigger,
    children,
    hasChildren = false,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function getIcon(name?: string) {
    if (!name) return null;
    const camel = name
      .split('-')
      .map((p) => (p[0]?.toUpperCase() ?? '') + p.slice(1))
      .join('');
    return ((icons as unknown) as Record<string, import('svelte').Component<any, any, any>>)[camel] ?? null;
  }

  function handleSelect(item: Item) {
    if (item.disabled || item.value === undefined) return;
    onchange?.(item.value);
  }

  function isString(v: unknown): v is string {
    return typeof v === 'string';
  }
  function isSpec(v: unknown): boolean {
    return v != null && typeof v === 'object' && !Array.isArray(v) && typeof (v as any).type === 'string';
  }
</script>

<CM.Root>
  <CM.Trigger {id} class={cn('inline-block', className)} style={styleString}>
    {#if children}
      {@render children()}
    {:else if isString(trigger)}
      <span class="rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-sm text-muted-foreground">
        {trigger}
      </span>
    {:else if isSpec(trigger)}
      <NodeRenderer node={trigger} />
    {:else}
      <span class="rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-sm text-muted-foreground">
        Right-click here
      </span>
    {/if}
  </CM.Trigger>

  <CM.Portal>
    <CM.Content
      class="z-50 min-w-[180px] rounded-md border border-border bg-popover text-popover-foreground p-1 shadow-md"
    >
      {#each items as item, i (i)}
        {#if item.type === 'separator'}
          <CM.Separator class="-mx-1 my-1 h-px bg-border" />
        {:else}
          {@const ItemIcon = getIcon(item.icon)}
          <CM.Item
            disabled={item.disabled}
            onSelect={() => handleSelect(item)}
            class={cn(
              'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
              'data-[highlighted]:bg-muted data-[highlighted]:text-foreground',
              'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
              item.variant === 'destructive' && 'text-ripple-error-text data-[highlighted]:bg-destructive/10 data-[highlighted]:text-ripple-error-text'
            )}
          >
            {#if ItemIcon}<ItemIcon size={14} />{/if}
            <span class="flex-1">{item.label}</span>
            {#if item.shortcut}
              <span class="ml-auto text-xs tracking-widest text-muted-foreground">{item.shortcut}</span>
            {/if}
          </CM.Item>
        {/if}
      {/each}
    </CM.Content>
  </CM.Portal>
</CM.Root>
