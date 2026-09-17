<!--
  CardGridLayout.svelte — designed grid layout for intent='browse'/'select' (Wave 3: layouts).
  Created 2026-06-07.
  Adapted from ocean-flow's CardGridLayout, rewired off genesis IconWidget/shadcn
  onto RIPPLE's molecules (ItemCard) + design tokens. COMPOSES ItemCard rather than
  re-implementing card chrome.

  A responsive grid of ItemCard. When intent='select' the cards show a selection
  indicator and reflect `selectedIds`; clicking a card fires onSelect(id). Field
  mapping (which data key is the title / image / price …) comes from the adapter's
  `input.fields`, so the same layout serves products, options, services, etc.

  PURE: reads only the `input` produced by the adapter; never fetches or calls a
  service. Selection state is owned by the host (IntentRenderer) — we reflect it.
-->
<script lang="ts">
  import ItemCard from '$lib/molecules/ItemCard.svelte';
  import EmptyState from '$lib/widgets/display/EmptyState.svelte';
  import type { LayoutInput } from '../layout-adapter.js';

  interface Props {
    input: LayoutInput;
    /** Currently-selected item ids (for intent='select'). */
    selectedIds?: string[];
    /** Fired when a card is clicked, with the item's id. */
    onSelect?: (id: string, item: Record<string, unknown>) => void;
    /** Render denser single-column rows (used by ListLayout). */
    dense?: boolean;
  }

  let { input, selectedIds = [], onSelect, dense = false }: Props = $props();

  const fields = $derived(input.fields);
  const items = $derived(input.items);
  const meta = $derived(input.meta);
  const isSelect = $derived(input.spec.intent === 'select');
  const selectionMode = $derived<'single' | 'multiple'>(
    input.spec.selection === 'multiple' ? 'multiple' : 'single',
  );

  function field(item: Record<string, unknown>, key: string): unknown {
    const mapped = fields[key];
    return mapped ? item[mapped] : undefined;
  }

  function idOf(item: Record<string, unknown>, index: number): string {
    return String(field(item, 'id') ?? item.id ?? index);
  }

  function isSelected(item: Record<string, unknown>, index: number): boolean {
    return selectedIds.includes(idOf(item, index));
  }

  function asString(v: unknown): string | undefined {
    return v == null ? undefined : String(v);
  }

  // Responsive columns from the layout engine's metadata (1 = list/dense).
  const gridCols = $derived(
    dense || meta.columns === 1
      ? 'grid-cols-1'
      : meta.columns === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : meta.columns >= 4
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          : 'grid-cols-1 sm:grid-cols-2',
  );
</script>

{#if items.length === 0}
  <EmptyState
    title="Nothing to show yet"
    description="There are no items to display."
    icon="search"
  />
{:else}
  <div class="grid {gridCols} gap-3">
    {#each items as item, index (idOf(item, index))}
      <ItemCard
        id={idOf(item, index)}
        title={asString(field(item, 'title')) ?? `Item ${index + 1}`}
        subtitle={asString(field(item, 'subtitle'))}
        description={asString(field(item, 'description'))}
        image={asString(field(item, 'image'))}
        icon={asString(field(item, 'icon'))}
        badge={asString(field(item, 'badge'))}
        location={asString(field(item, 'location'))}
        price={field(item, 'price') as string | number | undefined}
        originalPrice={field(item, 'original_price') as string | number | undefined}
        rating={field(item, 'rating') as number | undefined}
        showImage={meta.showImages}
        showPrice={meta.showPrices}
        compact={dense || meta.compact}
        showSelection={isSelect}
        selected={isSelected(item, index)}
        selectionMode={selectionMode}
        onclick={() => onSelect?.(idOf(item, index), item)}
      />
    {/each}
  </div>
{/if}
