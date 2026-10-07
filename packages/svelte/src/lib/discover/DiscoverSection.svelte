<!-- discover/DiscoverSection.svelte — one titled shelf of the Discover page: the
     heading and its blurb, an optional "see all" link, then the items in a
     DiscoverGrid for the given view. Children are the tiles (or rows, for the
     list view). The "see all" control is a link with `moreHref` and a button
     with `onmore`; with neither it is not drawn. Ids follow the app:
     discover-h-{id} on the heading, discover-section-{id} as the test id. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Button } from '../components/ui/button/index.js';
  import { cn } from '$lib/utils.js';
  import DiscoverGrid from './DiscoverGrid.svelte';
  import type { DiscoverView } from './layout.js';

  let {
    id,
    title,
    blurb,
    more,
    moreHref,
    onmore,
    view = 'grid',
    class: className,
    children,
  }: {
    /** Section key: builds the heading id and the test id. */
    id: string;
    title: string;
    blurb?: string;
    /** The "see all" label, drawn with a trailing arrow. */
    more?: string;
    moreHref?: string;
    onmore?: () => void;
    view?: DiscoverView;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<section class={cn('flex flex-col gap-4', className)} aria-labelledby={`discover-h-${id}`} data-testid={`discover-section-${id}`}>
  <div class="flex flex-wrap items-end justify-between gap-2">
    <div>
      <h2 id={`discover-h-${id}`} class="text-title-3 font-semibold text-foreground">{title}</h2>
      {#if blurb}<p class="text-subheadline text-muted-foreground">{blurb}</p>{/if}
    </div>
    {#if more && moreHref}
      <Button variant="link" size="sm" href={moreHref}>{more} →</Button>
    {:else if more && onmore}
      <Button variant="link" size="sm" onclick={onmore}>{more} →</Button>
    {/if}
  </div>
  <DiscoverGrid {view} label={title}>{@render children()}</DiscoverGrid>
</section>
