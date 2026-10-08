<!-- discover/ItemArt.svelte — the 16:9 picture for one Discover item: the image
     when there is one, a tinted placeholder with the title's initial when there
     is not, a music cover for a song with no picture, and a play badge on every
     video, poster or not. Props in, markup out: the <img> is in the server HTML.
     Only an http(s) imageUrl reaches src; a picture that fails to load drops
     to the placeholder after hydration, and the server frame is unchanged.
     The labels are derived here from the title, so the placeholder never
     claims a poster that is not there. -->
<script lang="ts">
  import { safeUrl } from '@ripple-ui/core';
  import Music from '@lucide/svelte/icons/music';
  import Play from '@lucide/svelte/icons/play';
  import { cn } from '$lib/utils.js';
  import { httpUrl } from './item.js';
  import type { DiscoverMediaKind } from './types.js';

  let {
    imageUrl,
    title,
    mediaKind = null,
    tint,
    initial,
    class: className,
  }: {
    imageUrl: string | null;
    /** The item's title; the alt text and placeholder label are built from it. */
    title: string;
    mediaKind?: DiscoverMediaKind | null;
    /** The placeholder's colour, from tintFor(). A CSS colour or var(). */
    tint: string;
    /** The placeholder's glyph, from initialFor(). */
    initial: string;
    class?: string;
  } = $props();

  const src = $derived(httpUrl(imageUrl));
  // Keyed on the url, so a new picture gets its own try without an effect.
  let failedSrc = $state<string | null>(null);
  const showImage = $derived(src !== null && failedSrc !== src);
  const imgAlt = $derived(mediaKind === 'video' ? `Video poster for ${title}` : mediaKind === 'audio' ? `Song cover for ${title}` : `Preview of ${title}`);

  const frameClass = 'aspect-video w-full overflow-hidden rounded-[10px] border border-border bg-muted';
  // Two washes mixed off the tint, anchored top-left so it reads as artwork.
  const blankWash =
    'background-image: radial-gradient(118% 118% at 18% 0%, color-mix(in srgb, var(--art-tint) 30%, transparent), transparent 62%), linear-gradient(158deg, color-mix(in srgb, var(--art-tint) 14%, transparent), transparent 70%)';
</script>

{#snippet badge()}
  {#if mediaKind === 'video'}
    <span
      class="absolute right-2 bottom-2 grid size-7 place-items-center rounded-full bg-background/80 text-foreground"
      aria-hidden="true"
      data-testid="discover-video-badge"
    >
      <Play class="size-3.5" />
    </span>
  {/if}
{/snippet}

{#if mediaKind === 'audio' && !showImage}
  <div
    class={cn(frameClass, 'grid place-items-center bg-linear-to-br from-primary/25 via-muted to-muted', className)}
    role="img"
    aria-label={`Song cover for ${title}`}
    data-testid="discover-music-cover"
  >
    <Music class="size-8 text-primary" aria-hidden="true" />
  </div>
{:else if showImage}
  <div class={cn(frameClass, 'relative', className)}>
    <img class="block h-full w-full object-cover object-top" src={safeUrl(src, { kind: 'resource' })} alt={imgAlt} loading="lazy" decoding="async" onerror={() => (failedSrc = src)} />
    {@render badge()}
  </div>
{:else}
  <div class={cn(frameClass, 'relative grid place-items-center', className)} style={`--art-tint: ${tint}; ${blankWash}`} role="img" aria-label={`Preview of ${title}`}>
    <span
      class="text-4xl leading-none font-semibold tracking-tight opacity-90 select-none"
      style="color: color-mix(in srgb, var(--art-tint) 55%, var(--foreground))"
      aria-hidden="true">{initial}</span
    >
    {@render badge()}
  </div>
{/if}
