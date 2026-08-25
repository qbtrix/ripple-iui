<!--
  @file widgets/marketing/Navbar.svelte
  @description Marketing top nav: brand + links + optional CTA. Layout + text.
  @created 2026-05-30 — RFC 12 marketing widget pack.
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

<nav {id} class={cn('flex items-center justify-between gap-6 px-6 py-4 w-full', sticky && 'sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border', className)} style={styleString}>
  {#if brand}<span class="text-lg font-semibold tracking-tight">{brand}</span>{/if}
  <div class="flex items-center gap-6">
    {#each links as link}
      <a href={link.href} class="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</a>
    {/each}
    {#if cta}
      <a href={ctaHref} class="text-sm font-medium rounded-md bg-primary text-primary-foreground px-4 py-2 hover:opacity-90 transition-opacity">{cta}</a>
    {/if}
    {#if hasChildren && children}{@render children()}{/if}
  </div>
</nav>
