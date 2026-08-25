<!--
  Skeleton.svelte — Minimal loading placeholder shown by Ripple while a
  streaming spec hasn't produced its first valid parse yet.
  Created: 2026-04-16
  Variants: card (default), dashboard, text, none
-->
<script lang="ts">
  interface Props {
    variant?: 'card' | 'dashboard' | 'text' | 'none';
    class?: string;
  }

  let { variant = 'card', class: className = '' }: Props = $props();
</script>

{#if variant === 'none'}
  <!-- render nothing — for callers who handle loading externally -->
{:else if variant === 'text'}
  <div class="rskeleton rskeleton--text animate-pulse space-y-2 p-4 {className}">
    <div class="h-4 bg-muted rounded w-3/4"></div>
    <div class="h-4 bg-muted rounded w-1/2"></div>
  </div>
{:else if variant === 'dashboard'}
  <div class="rskeleton rskeleton--dashboard animate-pulse grid grid-cols-3 gap-3 p-4 {className}">
    {#each Array(6) as _, i (i)}
      <div class="h-24 bg-muted rounded"></div>
    {/each}
  </div>
{:else}
  <div class="rskeleton rskeleton--card animate-pulse rounded-lg border border-border p-4 space-y-3 {className}">
    <div class="h-5 bg-muted rounded w-1/3"></div>
    <div class="h-4 bg-muted rounded w-full"></div>
    <div class="h-4 bg-muted rounded w-5/6"></div>
  </div>
{/if}
