<!--
  @file widgets/marketing/FeatureGrid.svelte
  @description Responsive grid of feature cells: icon (optional), title, desc.
  @created 2026-05-30 — RFC 12 marketing widget pack.
  @change 2026-06-09 — ITEM 2: render the per-feature lucide `icon`. Resolves the
    slug to a lucide component via the same import-star + pascalCase lookup as
    display/Icon.svelte (SSR/static-safe — the lookup is a $derived computed at
    render time, NOT in onMount, so the SVG is baked into prerendered markup
    with JS off). Each icon sits in a tinted rounded chip above the title so the
    cards stop reading as bare text blocks. Unknown/missing slugs render no chip
    (graceful) rather than a broken glyph.
-->
<script lang="ts">
  import type { Component } from 'svelte';
  import * as iconMap from '@lucide/svelte';
  import { cn } from '$lib/utils.js';
  interface Feature { title: string; description?: string; icon?: string; }
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    features?: Feature[]; columns?: 2 | 3 | 4;
  }
  let { id, class: className, style, features = [], columns = 3 }: Props = $props();
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);
  const colClass = $derived({ 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }[columns]);

  // Lucide lookup — mirrors display/Icon.svelte so the marketing pack shares one
  // icon-resolution contract. Static-safe: pure derivation, no onMount.
  const lookup = iconMap as unknown as Record<string, Component>;
  function pascalCase(slug: string): string {
    return slug.split(/[-_]/g).filter(Boolean)
      .map((p) => p[0]?.toUpperCase() + p.slice(1).toLowerCase()).join('');
  }
  function resolveIcon(name?: string): Component | null {
    if (!name) return null;
    return lookup[pascalCase(name)] ?? lookup[`${pascalCase(name)}Icon`] ?? null;
  }
</script>

<div {id} class={cn('grid grid-cols-1 gap-6', colClass, className)} style={styleString}>
  {#each features as f}
    {@const Glyph = resolveIcon(f.icon)}
    <div class="flex flex-col gap-3 rounded-lg border border-border bg-card text-card-foreground p-5">
      {#if Glyph}
        <span class="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Glyph size={20} strokeWidth={2} aria-hidden="true" />
        </span>
      {/if}
      <span class="text-base font-semibold">{f.title}</span>
      {#if f.description}<p class="text-sm text-muted-foreground leading-relaxed">{f.description}</p>{/if}
    </div>
  {/each}
</div>
