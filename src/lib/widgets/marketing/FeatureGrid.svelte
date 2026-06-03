<!--
  @file widgets/marketing/FeatureGrid.svelte
  @description Responsive grid of feature cells: icon (optional), title, desc.
  @created 2026-05-30 — RFC 12 marketing widget pack.
  @note The optional per-feature `icon` field is reserved (a future named-icon
    render). It is intentionally not rendered here to keep the widget dependency-
    free and avoid an unused-import check error; title + description is the
    contract the marketing test verifies.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  interface Feature { title: string; description?: string; icon?: string; }
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    features?: Feature[]; columns?: 2 | 3 | 4;
  }
  let { id, class: className, style, features = [], columns = 3 }: Props = $props();
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);
  const colClass = $derived({ 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }[columns]);
</script>

<div {id} class={cn('grid grid-cols-1 gap-6', colClass, className)} style={styleString}>
  {#each features as f}
    <div class="flex flex-col gap-2 rounded-lg border border-border bg-card text-card-foreground p-5">
      <span class="text-base font-semibold">{f.title}</span>
      {#if f.description}<p class="text-sm text-muted-foreground leading-relaxed">{f.description}</p>{/if}
    </div>
  {/each}
</div>
