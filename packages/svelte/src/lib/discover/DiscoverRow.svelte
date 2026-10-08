<!-- discover/DiscoverRow.svelte — one Discover item in a list: a small copy of
     the same picture, title and one line, the usage count, then the actions.
     Built for scanning many items at once. With `href`, the art and the title are
     links; the art link is decorative. `target` and `rel` pass through to
     both, for consumers whose item pages are off-site. Renders fully on the
     server. Type scale as in the app's own list rows: text-body title,
     text-footnote line, text-caption-1 usage. -->
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

<div class={cn('flex items-center gap-4 px-3 py-2.5', className)} role="listitem" data-testid={`discover-item-${item.id}`}>
  <div class="w-24 shrink-0" aria-hidden="true">
    {#snippet art()}
      <ItemArt imageUrl={item.imageUrl} title={item.title} mediaKind={item.mediaKind} tint={tintFor(item.id)} initial={initialFor(item.title)} />
    {/snippet}
    {#if href}
      <a href={safeUrl(href)} {target} {rel} tabindex="-1" class="block">{@render art()}</a>
    {:else}
      {@render art()}
    {/if}
  </div>
  <div class="flex min-w-0 flex-1 flex-col">
    <span class="flex min-w-0 items-center gap-2">
      {#if href}
        <a href={safeUrl(href)} {target} {rel} class="truncate text-body font-semibold text-foreground hover:underline">{item.title}</a>
      {:else}
        <span class="truncate text-body font-semibold text-foreground">{item.title}</span>
      {/if}
      {#if item.featured}<Chip size="sm" variant="warning" label="Staff pick" />{/if}
    </span>
    <span class="truncate text-footnote text-muted-foreground">{item.desc}</span>
  </div>
  <div class="hidden w-40 shrink-0 text-caption-1 text-muted-foreground md:flex">
    <span class="inline-flex items-center gap-1 tabular-nums"><GitFork class="size-3" aria-hidden="true" />{usageLabel(item)}</span>
  </div>
  <ItemActions {item} {onremix} {onreport} {onopen} {busy} />
</div>
