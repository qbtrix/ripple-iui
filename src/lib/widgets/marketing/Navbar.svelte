<!--
  @file widgets/marketing/Navbar.svelte
  @description Marketing top nav: brand + links + optional CTA. Layout + text.
  @created 2026-05-30 — RFC 12 marketing widget pack.
  @updated 2026-06-04 — Visual polish: links get a padded pill hover state,
    the CTA gains a subtle shadow + lift on hover, sticky nav uses a stronger
    blur. Prop API unchanged. SSR-safe.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';

  interface NavLink { label: string; href: string; }
  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    brand?: string;
    links?: NavLink[];
    /** Optional CTA label rendered as a button on the right. */
    cta?: string;
    /** href for the CTA. */
    ctaHref?: string;
    /** Stick to the top on scroll. Default false. */
    sticky?: boolean;
    children?: Snippet;
    hasChildren?: boolean;
  }
  let { id, class: className, style, brand, links = [], cta, ctaHref = '#', sticky = false, children, hasChildren = false }: Props = $props();
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);
</script>

<nav {id} class={cn('flex items-center justify-between gap-6 px-6 py-4 w-full', sticky && 'sticky top-0 z-40 backdrop-blur-md bg-background/75 border-b border-border', className)} style={styleString}>
  {#if brand}<span class="text-lg font-semibold tracking-tight">{brand}</span>{/if}
  <div class="flex items-center gap-1">
    {#each links as link}
      <a href={link.href} class="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">{link.label}</a>
    {/each}
    {#if cta}
      <a href={ctaHref} class="ml-2 inline-flex text-sm font-medium rounded-md bg-primary text-primary-foreground px-4 py-2 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">{cta}</a>
    {/if}
    {#if hasChildren && children}{@render children()}{/if}
  </div>
</nav>
