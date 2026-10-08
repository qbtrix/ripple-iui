<!-- discover/DetailMedia.svelte — the media block of a Discover detail view: the
     video with its player and poster, the song cover with an audio player, or the
     image at full size. No dialog, no autoplay; players load nothing until asked.
     The src and poster sit in the markup so the server HTML is complete, and
     only http(s) urls reach either. -->
<script lang="ts">
  import { safeUrl } from '@ripple-ui/core';
  import { cn } from '$lib/utils.js';
  import ItemArt from './ItemArt.svelte';
  import { initialFor, tintFor } from './art.js';
  import { httpUrl, mediaFor } from './item.js';
  import type { DiscoverItem } from './types.js';

  let { item, class: className }: { item: DiscoverItem; class?: string } = $props();
  const media = $derived(mediaFor(item));
</script>

{#if media?.kind === 'video'}
  <!-- Generated clips carry no caption track. -->
  <!-- svelte-ignore a11y_media_has_caption -->
  <video
    class={cn('aspect-video w-full rounded-xl bg-muted', className)}
    src={safeUrl(media.url, { kind: 'resource' })}
    poster={safeUrl(httpUrl(item.imageUrl) ?? undefined, { kind: 'resource' })}
    controls
    preload="none"
    aria-label={`Video: ${item.title}`}
    data-testid="discover-detail-video"
  ></video>
{:else if media?.kind === 'audio'}
  <div class={cn('flex flex-col gap-3', className)}>
    <ItemArt imageUrl={item.imageUrl} title={item.title} mediaKind="audio" tint={tintFor(item.id)} initial={initialFor(item.title)} />
    <audio class="w-full" src={safeUrl(media.url, { kind: 'resource' })} controls preload="none" aria-label={`Song: ${item.title}`} data-testid="discover-detail-audio"></audio>
  </div>
{:else if media}
  <img class={cn('max-h-[70vh] w-full rounded-xl bg-muted object-contain', className)} src={safeUrl(media.url, { kind: 'resource' })} alt={item.title} data-testid="discover-detail-image" />
{/if}
