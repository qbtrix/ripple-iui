<!--
  EmptyState.svelte — dashed-border empty placeholder with an icon, title, description.
  Updated 2026-07-08: widened the `icon` union (+columns/check-square/file-text/clock/table)
  and their $derived mapping so the intent layouts render the real icon instead of hitting a
  type error and falling back to the inbox glyph.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import InboxIcon from '@lucide/svelte/icons/inbox';
  import SearchXIcon from '@lucide/svelte/icons/search-x';
  import FileXIcon from '@lucide/svelte/icons/file-x';
  import AlertOctagonIcon from '@lucide/svelte/icons/octagon-alert';
  import ColumnsIcon from '@lucide/svelte/icons/columns';
  import CheckSquareIcon from '@lucide/svelte/icons/check-square';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import TableIcon from '@lucide/svelte/icons/table';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title: string;
    description?: string;
    /** Lucide icon shorthand: inbox / search / file / error, plus layout icons columns / check-square / file-text / clock / table. */
    icon?: 'inbox' | 'search' | 'file' | 'error' | 'columns' | 'check-square' | 'file-text' | 'clock' | 'table';
    /** Default-slot for CTAs (e.g., a button). */
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style,
    title, description, icon = 'inbox', children, hasChildren = false
  }: Props = $props();

  const Icon = $derived(
    icon === 'search' ? SearchXIcon
      : icon === 'file' ? FileXIcon
      : icon === 'error' ? AlertOctagonIcon
      : icon === 'columns' ? ColumnsIcon
      : icon === 'check-square' ? CheckSquareIcon
      : icon === 'file-text' ? FileTextIcon
      : icon === 'clock' ? ClockIcon
      : icon === 'table' ? TableIcon
      : InboxIcon
  );

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div
  {id}
  class={cn(
    'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center',
    className
  )}
  style={styleString}
>
  <div class="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
    <Icon size={20} />
  </div>
  <div class="flex flex-col gap-1">
    <h3 class="text-sm font-semibold">{title}</h3>
    {#if description}
      <p class="text-sm text-muted-foreground max-w-sm">{description}</p>
    {/if}
  </div>
  {#if hasChildren && children}
    <div class="mt-1">{@render children()}</div>
  {/if}
</div>
