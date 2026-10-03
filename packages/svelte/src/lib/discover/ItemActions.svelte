<!-- discover/ItemActions.svelte — the action cluster a tile and a row share: the
     primary pill (a link when the item has a live page, a button otherwise), then
     Play / View, Remix and Report as icon buttons. Each button renders only when
     its callback is passed, so a static page gets just the links. -->
<script lang="ts">
  import Flag from '@lucide/svelte/icons/flag';
  import GitFork from '@lucide/svelte/icons/git-fork';
  import Maximize2 from '@lucide/svelte/icons/maximize-2';
  import Play from '@lucide/svelte/icons/play';
  import { Button } from '../components/ui/button/index.js';
  import { isStudioKind, mediaFor, primaryFor } from './item.js';
  import type { DiscoverItem } from './types.js';

  let {
    item,
    onremix,
    onreport,
    onopen,
    busy = false,
  }: {
    item: DiscoverItem;
    onremix?: (item: DiscoverItem) => void;
    onreport?: (item: DiscoverItem) => void;
    onopen?: (item: DiscoverItem) => void;
    busy?: boolean;
  } = $props();

  const primary = $derived(primaryFor(item));
  const media = $derived(mediaFor(item));
</script>

<div class="flex shrink-0 items-center gap-0.5">
  {#if primary?.href}
    <Button size="sm" class="rounded-full px-4" href={primary.href} target="_blank" rel="noopener noreferrer" aria-label={`${primary.label} ${item.title} (opens in a new tab)`}>{primary.label}</Button>
  {:else if primary && onremix}
    <Button size="sm" class="rounded-full px-4" disabled={busy} onclick={() => onremix(item)}>{primary.label}</Button>
  {/if}
  {#if media && onopen}
    {@const playable = media.kind !== 'image'}
    <Button size="icon-sm" variant="ghost" aria-label={`${playable ? 'Play' : 'View'} ${item.title}`} title={playable ? 'Play' : 'View'} onclick={() => onopen(item)}>
      {#if playable}<Play class="size-4" />{:else}<Maximize2 class="size-4" />{/if}
    </Button>
  {/if}
  {#if !isStudioKind(item.kind) && onremix}
    <Button size="icon-sm" variant="ghost" aria-label={`Remix ${item.title}`} title="Remix" disabled={busy} onclick={() => onremix(item)}>
      <GitFork class="size-4" />
    </Button>
  {/if}
  {#if onreport}
    <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label={`Report ${item.title}`} title="Report" onclick={() => onreport(item)}>
      <Flag class="size-3.5" />
    </Button>
  {/if}
</div>
