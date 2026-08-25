<!--
  @file widgets/marketing/LogoCloud.svelte
  @description Row of client/partner logos with an optional heading. Grayscale
    by default, color on hover. Layout + images.
  @created 2026-05-30 — RFC 12 marketing widget pack.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  interface Logo { src: string; alt: string; href?: string; }
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    heading?: string; logos?: Logo[];
  }
  let { id, class: className, style, heading, logos = [] }: Props = $props();
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);
</script>

<section {id} class={cn('w-full flex flex-col gap-6 items-center py-8', className)} style={styleString}>
  {#if heading}<p class="text-xs uppercase tracking-wider text-muted-foreground">{heading}</p>{/if}
  <div class="flex flex-wrap items-center justify-center gap-8 md:gap-12">
    {#each logos as logo}
      {#if logo.href}
        <a href={logo.href}><img src={logo.src} alt={logo.alt} class="h-7 md:h-8 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition" /></a>
      {:else}
        <img src={logo.src} alt={logo.alt} class="h-7 md:h-8 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition" />
      {/if}
    {/each}
  </div>
</section>
