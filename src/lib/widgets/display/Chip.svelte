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
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style, label,
    variant = 'default', size = 'md', closable = false, onclose,
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
