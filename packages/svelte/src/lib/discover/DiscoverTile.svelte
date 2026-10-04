<!-- discover/DiscoverTile.svelte — one Discover item in a grid or shelf: the
     picture as a borderless rounded tile, then title, one line and the usage
     line, with the actions beside them. With `href`, the art and the title are
     links; the art link is decorative (the title carries the name). `target`
     and `rel` pass through to both, for consumers whose item pages are
     off-site. Renders fully on the server. -->
<script lang="ts">
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

<article class={cn('group flex min-w-0 flex-col gap-3', className)} data-testid={`discover-item-${item.id}`}>
  <div class="relative overflow-hidden rounded-2xl transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
    {#snippet art()}
      <ItemArt imageUrl={item.imageUrl} title={item.title} mediaKind={item.mediaKind} tint={tintFor(item.id)} initial={initialFor(item.title)} />
    {/snippet}
    {#if href}
      <a {href} {target} {rel} tabindex="-1" aria-hidden="true" class="block">{@render art()}</a>
    {:else}
      {@render art()}
    {/if}
    {#if item.featured}
      <Chip size="sm" variant="warning" label="Staff pick" class="absolute top-2 left-2" />
    {/if}
  </div>
  <div class="flex items-start gap-3">
    <div class="flex min-w-0 flex-1 flex-col">
      {#if href}
        <a {href} {target} {rel} class="truncate text-sm font-semibold text-foreground hover:underline">{item.title}</a>
      {:else}
        <span class="truncate text-sm font-semibold text-foreground">{item.title}</span>
      {/if}
      <span class="truncate text-xs text-muted-foreground">{item.desc}</span>
      <span class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
        <GitFork class="size-3" aria-hidden="true" />{usageLabel(item)}
      </span>
    </div>
    <ItemActions {item} {onremix} {onreport} {onopen} {busy} />
  </div>
</article>
