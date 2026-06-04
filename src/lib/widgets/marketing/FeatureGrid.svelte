<!--
  @file widgets/marketing/FeatureGrid.svelte
  @description Responsive grid of feature/service cards: optional lucide icon,
    title, description.
  @created 2026-05-30 — RFC 12 marketing widget pack.
  @updated 2026-06-04 — Richer cards (icon medallion, hover lift, border
    accent) + the optional per-feature `icon` field now RENDERS a lucide icon
    in a rounded badge at the top of the card. Icon resolution reuses the
    display/Icon namespace-lookup mechanism (static `@lucide/svelte` import +
    PascalCase slug lookup) so it stays SSR-safe / Tier-0 (no dynamic import,
    no window/onMount). Unknown slugs fall back to nothing. Prop API is
    additive: `icon` was already a reserved field on the Feature interface.
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

  // Reuse the display/Icon resolution strategy: a static namespace import is
  // SSR-safe (resolves synchronously at render, no dynamic import()).
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

<div {id} class={cn('grid grid-cols-1 gap-5', colClass, className)} style={styleString}>
  {#each features as f}
    {@const Icon = resolveIcon(f.icon)}
    <div class="group flex flex-col gap-3 rounded-xl border border-border bg-card text-card-foreground p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      {#if Icon}
        <span class="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon size={22} strokeWidth={2} />
        </span>
      {/if}
      <span class="text-base font-semibold leading-snug">{f.title}</span>
      {#if f.description}<p class="text-sm text-muted-foreground leading-relaxed">{f.description}</p>{/if}
    </div>
  {/each}
</div>
