<!-- discover/DiscoverTile.svelte — one Discover item in a grid or shelf: the
     picture as a borderless rounded tile, then title, one line and the usage
     line, with the actions beside them. The type scale (text-headline,
     text-footnote, text-caption-1), the 10px picture radius and the hover lift
     match paw-enterprise's TemplateTile, the app's own tile. With `href`, the
     art and the title are links; the art link is decorative (the title carries
     the name). `target` and `rel` pass through to both, for consumers whose
     item pages are off-site. Renders fully on the server. -->
<script lang="ts">
  import { safeUrl } from '@ripple-ui/core';
  import GitFork from '@lucide/svelte/icons/git-fork';
  import Chip from '../widgets/display/Chip.svelte';
  import { cn } from '$lib/utils.js';
  import ItemActions from './ItemActions.svelte';
  import ItemArt from './ItemArt.svelte';
  import { initialFor, tintFor } from './art.js';
  import { usageLabel } from './item.js';
  import type { DiscoverItem } from './types.js';

  let {
    item,
    href,
    target,
    rel,
    onremix,
    onreport,
    onopen,
    busy = false,
    class: className,
  }: {
    item: DiscoverItem;
    /** The item's own page. When set, the art and title link to it. */
    href?: string;
    /** Passed to both links. Off-site consumers pass target="_blank" rel="noopener". */
    target?: string;
    rel?: string;
    onremix?: (item: DiscoverItem) => void;
    onreport?: (item: DiscoverItem) => void;
    onopen?: (item: DiscoverItem) => void;
    busy?: boolean;
    class?: string;
  } = $props();
</script>

<article class={cn('group/tile flex min-w-0 flex-col gap-3', className)} data-testid={`discover-item-${item.id}`}>
  <div
    class="relative overflow-hidden rounded-2xl transition-transform duration-150 ease-out group-focus-within/tile:-translate-y-px group-hover/tile:-translate-y-px motion-reduce:transition-none motion-reduce:group-focus-within/tile:translate-y-0 motion-reduce:group-hover/tile:translate-y-0"
  >
    {#snippet art()}
      <ItemArt imageUrl={item.imageUrl} title={item.title} mediaKind={item.mediaKind} tint={tintFor(item.id)} initial={initialFor(item.title)} />
    {/snippet}
    {#if href}
      <a href={safeUrl(href)} {target} {rel} tabindex="-1" aria-hidden="true" class="block">{@render art()}</a>
    {:else}
      {@render art()}
    {/if}
    {#if item.featured}
      <Chip size="sm" variant="warning" label="Staff pick" class="absolute top-2 left-2" />
    {/if}
  </div>
  <div class="flex items-start gap-3">
    <div class="flex min-w-0 flex-1 flex-col">
      <h3 class="m-0 truncate text-headline text-foreground">
        {#if href}<a href={safeUrl(href)} {target} {rel} class="hover:underline">{item.title}</a>{:else}{item.title}{/if}
      </h3>
      {#if item.desc}
        <p class="m-0 truncate text-footnote text-muted-foreground">{item.desc}</p>
      {/if}
      <p class="m-0 mt-1 flex items-center gap-1.5 text-caption-1 text-muted-foreground tabular-nums">
        <GitFork class="size-3" aria-hidden="true" />{usageLabel(item)}
      </p>
    </div>
    <ItemActions {item} {onremix} {onreport} {onopen} {busy} />
  </div>
</article>
