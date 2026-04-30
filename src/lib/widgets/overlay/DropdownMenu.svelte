<script lang="ts">
  import { DropdownMenu as DM } from 'bits-ui';
  import { cn } from '$lib/utils.js';
  import * as icons from '@lucide/svelte';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

  interface Item {
    label?: string;
    /** Lucide icon name (kebab-case). */
    icon?: string;
    /** Value emitted via onchange when this item is selected. */
    value?: string;
    /** "destructive" for red text. */
    variant?: 'default' | 'destructive';
    disabled?: boolean;
    /** Separator marker — set type:"separator" between items. */
    type?: 'separator' | 'item';
    /** Optional shortcut hint shown on the right (e.g. "⌘K"). */
    shortcut?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Trigger button label. */
    label?: string;
    /** Trigger button variant — passes through to the underlying button. */
    triggerVariant?: 'default' | 'outline' | 'ghost' | 'secondary';
    items?: Item[];
    /** Where the menu opens relative to the trigger. */
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    /** Hide the trailing chevron on the trigger. */
    hideChevron?: boolean;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style,
    label = 'Open menu', triggerVariant = 'outline',
    items = [], side = 'bottom', align = 'start',
    hideChevron = false, onchange
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
    return ((icons as unknown) as Record<string, unknown>)[camel] ?? null;
  }

  const triggerClass = $derived(
    cn(
      'inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors h-9 px-3',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      'disabled:pointer-events-none disabled:opacity-50',
      triggerVariant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
      triggerVariant === 'outline' && 'border border-border bg-background hover:bg-muted/60',
      triggerVariant === 'ghost' && 'hover:bg-muted/60',
      triggerVariant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      className
    )
  );

  function handleSelect(item: Item) {
    if (item.disabled) return;
    if (item.value !== undefined) onchange?.(item.value);
  }
</script>

<DM.Root>
  <DM.Trigger {id} class={triggerClass} style={styleString}>
    <span>{label}</span>
    {#if !hideChevron}
      <ChevronDownIcon size={14} class="opacity-70" />
    {/if}
  </DM.Trigger>

  <DM.Portal>
    <DM.Content
      {side}
      {align}
      sideOffset={4}
      class={cn(
        'z-50 min-w-[180px] rounded-md border border-border bg-popover text-popover-foreground p-1 shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
      )}
    >
      {#each items as item, i (i)}
        {#if item.type === 'separator'}
          <DM.Separator class="-mx-1 my-1 h-px bg-border" />
        {:else}
          {@const ItemIcon = getIcon(item.icon)}
          <DM.Item
            disabled={item.disabled}
            onSelect={() => handleSelect(item)}
            class={cn(
              'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
              'data-[highlighted]:bg-muted data-[highlighted]:text-foreground',
              'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
              item.variant === 'destructive' && 'text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive'
            )}
          >
            {#if ItemIcon}<ItemIcon size={14} />{/if}
            <span class="flex-1">{item.label}</span>
            {#if item.shortcut}
              <span class="ml-auto text-xs tracking-widest text-muted-foreground">{item.shortcut}</span>
            {/if}
          </DM.Item>
        {/if}
      {/each}
    </DM.Content>
  </DM.Portal>
</DM.Root>
