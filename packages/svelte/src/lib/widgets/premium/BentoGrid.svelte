<!--
  @file widgets/premium/BentoGrid.svelte
  @description A bento/masonry-style feature grid: cells span 1-3 columns for a
    varied, magazine-like layout. Pure CSS grid (Tailwind), no animation — so it
    is SSR-safe by construction and never touches the motion engine.
  @provenance Adapted from svelte-animations (github.com/SikandarJODD/
    svelte-animations, MIT — Svelte Magic UI port). Ripple-shaped; MIT preserved.
  @created 2026-05-30 — RFC 12 premium pack.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  interface BentoItem { title: string; description?: string; span?: 1 | 2 | 3; }
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    /** Declarative cells. Omit to supply your own via children. */
    items?: BentoItem[];
    /** Column count. Default 3. */
    columns?: number;
    children?: Snippet;
    hasChildren?: boolean;
  }
  let { id, class: className, style, items = [], columns = 3, children, hasChildren = false }: Props = $props();
  const styleString = $derived([
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : '',
    `--bento-cols:${columns}`,
  ].filter(Boolean).join(';'));
  const spanClass = (span?: 1 | 2 | 3) => (span === 3 ? 'col-span-3' : span === 2 ? 'col-span-2' : 'col-span-1');
</script>

<div {id} data-bento-grid class={cn('ripple-bento grid gap-4', className)} style={styleString}>
  {#each items as item}
    <div class={cn('rounded-xl border bg-card p-5 flex flex-col gap-2', spanClass(item.span))}>
      <h3 class="font-semibold leading-tight">{item.title}</h3>
      {#if item.description}<p class="text-sm text-muted-foreground">{item.description}</p>{/if}
    </div>
  {/each}
  {#if hasChildren && children}{@render children()}{/if}
</div>

<style>
  .ripple-bento { grid-template-columns: repeat(var(--bento-cols, 3), minmax(0, 1fr)); }
</style>
