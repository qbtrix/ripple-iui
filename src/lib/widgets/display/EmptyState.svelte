<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import InboxIcon from '@lucide/svelte/icons/inbox';
  import SearchXIcon from '@lucide/svelte/icons/search-x';
  import FileXIcon from '@lucide/svelte/icons/file-x';
  import AlertOctagonIcon from '@lucide/svelte/icons/octagon-alert';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title: string;
    description?: string;
    /** Lucide icon name shorthand: inbox / search / file / error. */
    icon?: 'inbox' | 'search' | 'file' | 'error';
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
