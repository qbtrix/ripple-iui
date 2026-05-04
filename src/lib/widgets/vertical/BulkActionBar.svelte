<!-- src/lib/widgets/vertical/BulkActionBar.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import * as icons from '@lucide/svelte';
  import XIcon from '@lucide/svelte/icons/x';

  type Action = {
    id: string;
    label: string;
    icon?: string;
    variant?: 'default' | 'destructive' | 'outline';
    disabled?: boolean;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Currently selected count. The bar shows when selectedCount > 0. */
    selectedCount?: number;
    /** Singular/plural noun. */
    noun?: string;
    actions?: Action[];
    /** Position the bar floats: 'inline' renders in flow, 'sticky-bottom' anchors to bottom. */
    position?: 'inline' | 'sticky-bottom';
    onaction?: (id: string) => void;
    onclear?: () => void;
  }

  let {
    id,
    class: className,
    style,
    selectedCount = 0,
    noun = 'item',
    actions = [],
    position = 'inline',
    onaction,
    onclear
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

  const visible = $derived(selectedCount > 0);
  const label = $derived(`${selectedCount} ${noun}${selectedCount === 1 ? '' : 's'} selected`);
</script>

{#if visible}
  <div
    {id}
    class={cn(
      'flex items-center gap-2 rounded-ripple border border-ripple-border px-3 py-2 shadow-md',
      position === 'sticky-bottom' && 'sticky bottom-4 z-10',
      className
    )}
    style={styleString}
    role="toolbar"
    aria-label="Bulk actions"
  >
    <button
      type="button"
      class="rounded p-1 hover:bg-muted transition-colors"
      aria-label="Clear selection"
      onclick={() => onclear?.()}
    >
      <XIcon size={14} />
    </button>
    <span class="text-sm font-medium tabular-nums">{label}</span>
    <div class="ml-auto flex items-center gap-1.5">
      {#each actions as a (a.id)}
        {@const Icon = getIcon(a.icon)}
        <button
          type="button"
          disabled={a.disabled}
          onclick={() => onaction?.(a.id)}
          class={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 h-8 text-sm font-medium transition-colors disabled:opacity-50',
            a.variant === 'destructive' && 'text-destructive hover:bg-destructive/10',
            a.variant === 'outline' && 'border border-border hover:bg-muted/60',
            (!a.variant || a.variant === 'default') && 'hover:bg-muted/60'
          )}
        >
          {#if Icon}<Icon size={14} />{/if}
          {a.label}
        </button>
      {/each}
    </div>
  </div>
{/if}
