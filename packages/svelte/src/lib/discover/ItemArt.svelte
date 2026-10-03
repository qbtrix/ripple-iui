<!-- discover/ItemArt.svelte — the 16:9 picture for one Discover item: the image
     when there is one, a tinted placeholder with the title's initial when there
     is not, a music cover for a song with no picture, and a play badge over a
     video poster. Props in, markup out: the <img> is in the server HTML. -->
<script lang="ts">
  import Music from '@lucide/svelte/icons/music';
  import Play from '@lucide/svelte/icons/play';
  import { cn } from '$lib/utils.js';
  import type { DiscoverMediaKind } from './types.js';

  let {
    imageUrl,
    alt,
    mediaKind = null,
    tint,
    initial,
    class: className,
  }: {
    imageUrl: string | null;
    alt: string;
    mediaKind?: DiscoverMediaKind | null;
    /** The placeholder's colour, from tintFor(). A CSS colour or var(). */
    tint: string;
    /** The placeholder's glyph, from initialFor(). */
    initial: string;
    class?: string;
  } = $props();

  const frameClass = 'aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted';
  // Two washes mixed off the tint, anchored top-left so it reads as artwork.
  const blankWash =
    'background-image: radial-gradient(118% 118% at 18% 0%, color-mix(in srgb, var(--art-tint) 30%, transparent), transparent 62%), linear-gradient(158deg, color-mix(in srgb, var(--art-tint) 14%, transparent), transparent 70%)';
</script>

{#if mediaKind === 'audio' && !imageUrl}
  <div
    class={cn(frameClass, 'grid place-items-center bg-linear-to-br from-primary/25 via-muted to-muted', className)}
    role="img"
    aria-label={alt}
    data-testid="discover-music-cover"
  >
    <Music class="size-8 text-primary" aria-hidden="true" />
  </div>
{:else if imageUrl}
  <div class={cn(frameClass, 'relative', className)}>
    <img class="block h-full w-full object-cover object-top" src={imageUrl} {alt} loading="lazy" decoding="async" />
    {#if mediaKind === 'video'}
      <span
        class="absolute right-2 bottom-2 grid size-7 place-items-center rounded-full bg-background/80 text-foreground"
        aria-hidden="true"
        data-testid="discover-video-badge"
      >
        <Play class="size-3.5" />
      </span>
    {/if}
  </div>
{:else}
  <div class={cn(frameClass, 'grid place-items-center', className)} style={`--art-tint: ${tint}; ${blankWash}`} role="img" aria-label={alt}>
    <span
      class="text-4xl leading-none font-semibold tracking-tight opacity-90 select-none"
      style="color: color-mix(in srgb, var(--art-tint) 55%, var(--foreground))"
      aria-hidden="true">{initial}</span
    >
  </div>
{/if}
