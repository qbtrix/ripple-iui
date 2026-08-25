<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    description?: string;
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style,
    title, description, children, hasChildren = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<section {id} class={cn('flex flex-col gap-3 py-4', className)} style={styleString}>
  {#if title || description}
    <header class="flex flex-col gap-0.5">
      {#if title}<h2 class="text-base font-semibold tracking-tight">{title}</h2>{/if}
      {#if description}<p class="text-sm text-muted-foreground">{description}</p>{/if}
    </header>
  {/if}
  {#if hasChildren && children}
    {@render children()}
  {/if}
</section>
