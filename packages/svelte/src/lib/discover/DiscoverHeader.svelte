<!-- discover/DiscoverHeader.svelte — the top of the Discover page: the pitch
     (a title whose `accent` half is painted in the primary colour, then a lead
     paragraph), the search and audience chips as children, and an optional
     `aside` beside it on wide screens (the app's QR card). The heading is an h2
     under an app page header; a page without one passes as="h1". -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';

  let {
    title,
    accent,
    lead,
    as = 'h2',
    class: className,
    children,
    aside,
  }: {
    title: string;
    /** Drawn after the title in the primary colour. */
    accent?: string;
    lead?: string;
    as?: 'h1' | 'h2';
    class?: string;
    /** Search, chips: stacked under the lead. */
    children?: Snippet;
    aside?: Snippet;
  } = $props();
</script>

<div class={cn('mx-auto grid w-full max-w-[1280px] items-center gap-9 px-6 pt-4 lg:grid-cols-[1.1fr_0.9fr]', className)}>
  <div class="flex flex-col gap-4">
    <svelte:element this={as} class="text-title-1 font-semibold tracking-tight text-foreground">
      {title}{#if accent}{' '}<span class="text-primary">{accent}</span>{/if}
    </svelte:element>
    {#if lead}<p class="max-w-prose text-body text-muted-foreground">{lead}</p>{/if}
    {@render children?.()}
  </div>
  {@render aside?.()}
</div>
