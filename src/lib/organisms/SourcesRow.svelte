<!--
  SourcesRow.svelte — RIPPLE-NATIVE organism (Wave 2: organisms).
  Created 2026-06-07.
  Adapted from ocean-flow's organisms/SourcesRow.svelte, rewired off the genesis
  molecules namespace onto ripple's SourceCard (surfaced via $lib/molecules) +
  design tokens. Perplexity-style horizontal row of citation/source cards.

  Pure presentation — props in, UI out. Maps each source descriptor onto a
  ripple SourceCard and emits onSourceClick(source). No data fetching.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import SourceCard from '$lib/widgets/research/SourceCard.svelte';

  interface Source {
    id: string;
    title: string;
    url?: string;
    favicon?: string;
    /** Display domain; falls back to deriving from the url. */
    domain?: string;
  }

  interface Props {
    sources: Source[];
    onSourceClick?: (source: Source) => void;
    class?: string;
  }

  let { sources, onSourceClick, class: className }: Props = $props();

  function domainOf(source: Source): string {
    if (source.domain) return source.domain;
    if (!source.url) return '';
    try {
      return new URL(source.url).hostname.replace(/^www\./, '');
    } catch {
      return source.url;
    }
  }
</script>

{#if sources.length > 0}
  <div class={cn('group/sources relative', className)}>
    <!-- Gradient edge masks hint at horizontal scroll on hover. -->
    <div
      class="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-ripple-surface to-transparent opacity-0 transition-opacity duration-300 sm:group-hover/sources:opacity-100"
    ></div>
    <div
      class="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-ripple-surface to-transparent opacity-0 transition-opacity duration-300 sm:group-hover/sources:opacity-100"
    ></div>

    <div
      class="flex w-full gap-2.5 overflow-x-auto overflow-y-hidden scroll-smooth px-1 py-1"
      style="scrollbar-width: none; -ms-overflow-style: none;"
    >
      {#each sources as source (source.id)}
        <SourceCard
          title={source.title}
          source={domainOf(source)}
          url={source.url}
          favicon={source.favicon}
          onclick={() => onSourceClick?.(source)}
        />
      {/each}
    </div>
  </div>
{/if}
