<!--
  @file widgets/marketing/LogoCloud.svelte
  @description Row of client/partner logos with an optional heading. Grayscale
    by default, color on hover. Renders the brand NAME as styled text when no
    valid logo image URL is supplied, so it never shows a broken <img>.
  @created 2026-05-30 — RFC 12 marketing widget pack.
  @updated 2026-06-04 — Graceful missing-logo handling: when a logo has no
    usable `src` (missing / empty / whitespace / a "placeholder" sentinel),
    render the brand name (`name` ?? `alt`) as styled text instead of a broken
    image. `src` is now optional and `name` is a new optional label field —
    both additive (existing callers that pass src+alt are unchanged). Also
    polished spacing/hover. SSR-safe (pure markup + CSS).
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  interface Logo { src?: string; alt: string; href?: string; name?: string; }
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    heading?: string; logos?: Logo[];
  }
  let { id, class: className, style, heading, logos = [] }: Props = $props();
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);

  // A logo image is usable only when src is a non-empty, non-placeholder string.
  function hasImage(logo: Logo): boolean {
    const src = logo.src?.trim();
    if (!src) return false;
    return !/^(placeholder|none|null|undefined)$/i.test(src);
  }
  // Text-mode label falls back from name -> alt.
  function labelFor(logo: Logo): string {
    return logo.name ?? logo.alt ?? '';
  }
</script>

<section {id} class={cn('w-full flex flex-col gap-6 items-center py-8', className)} style={styleString}>
  {#if heading}<p class="text-xs uppercase tracking-wider text-muted-foreground">{heading}</p>{/if}
  <div class="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14">
    {#each logos as logo}
      {#if hasImage(logo)}
        {#if logo.href}
          <a href={logo.href} class="inline-flex"><img src={logo.src} alt={logo.alt} class="h-7 md:h-8 opacity-60 grayscale transition duration-200 hover:opacity-100 hover:grayscale-0" /></a>
        {:else}
          <img src={logo.src} alt={logo.alt} class="h-7 md:h-8 opacity-60 grayscale transition duration-200 hover:opacity-100 hover:grayscale-0" />
        {/if}
      {:else if logo.href}
        <a href={logo.href} class="text-lg font-semibold tracking-tight text-muted-foreground/70 transition-colors duration-200 hover:text-foreground">{labelFor(logo)}</a>
      {:else}
        <span class="text-lg font-semibold tracking-tight text-muted-foreground/70 transition-colors duration-200 hover:text-foreground">{labelFor(logo)}</span>
      {/if}
    {/each}
  </div>
</section>
