<!-- src/lib/widgets/display/Chip.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import XIcon from '@lucide/svelte/icons/x';

  type Variant = 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  type Size = 'sm' | 'md';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    variant?: Variant;
    size?: Size;
    closable?: boolean;
    onclose?: () => void;
    /** Body click — wired by NodeRenderer when spec uses `on_click`. */
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style, label,
    variant = 'default', size = 'md', closable = false, onclose, onclick,
    children, hasChildren = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const variantClass = $derived(
    variant === 'primary' ? 'bg-primary/10 text-primary border-primary/20'
    : variant === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
    : variant === 'warning' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
    : variant === 'destructive' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
    : 'bg-muted text-foreground border-border'
  );

  const sizeClass = $derived(
    size === 'sm' ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5'
  );

  const iconSize = $derived(size === 'sm' ? 10 : 12);
</script>

{#if onclick}
  <button
    type="button"
    {id}
    onclick={(e) => {
      // Don't fire body click when the close X is clicked.
      if ((e.target as HTMLElement).closest('[data-chip-close]')) return;
      onclick?.(e);
    }}
    class={cn(
      'inline-flex items-center rounded-full border font-medium cursor-pointer transition-colors hover:brightness-95',
      variantClass, sizeClass, className
    )}
    style={styleString}
  >
    {#if hasChildren && children}
      {@render children()}
    {:else if label}
      {label}
    {/if}
    {#if closable}
      <span
        role="button"
        tabindex="-1"
        data-chip-close
        class="hover:opacity-70 transition-opacity"
        aria-label="Remove"
        onclick={(e) => { e.stopPropagation(); onclose?.(); }}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclose?.(); } }}
      >
        <XIcon size={iconSize} />
      </span>
    {/if}
  </button>
{:else}
  <span
    {id}
    class={cn('inline-flex items-center rounded-full border font-medium', variantClass, sizeClass, className)}
    style={styleString}
  >
    {#if hasChildren && children}
      {@render children()}
    {:else if label}
      {label}
    {/if}
    {#if closable}
      <button
        type="button"
        class="hover:opacity-70 transition-opacity"
        aria-label="Remove"
        onclick={() => onclose?.()}
      >
        <XIcon size={iconSize} />
      </button>
    {/if}
  </span>
{/if}
