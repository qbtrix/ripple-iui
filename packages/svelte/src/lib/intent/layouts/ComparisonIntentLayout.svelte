<!--
  ComparisonIntentLayout.svelte — intent-layout wrapper for ComparisonLayout composite.
  Created 2026-06-07.
  Routes `display.layout='comparison'` specs to the ripple ComparisonLayout composite
  widget. Reads `spec.data.items` (the things to compare) and optional
  `spec.data.features` (the feature rows). The composite does the full hero-card +
  feature-grid + card/table toggle chrome. PURE adapter — no fetch, no service.
  No top-level $state (child-only component; avoids repo $state flake).
-->
<script lang="ts">
  import ComparisonLayout from '$lib/widgets/composite/ComparisonLayout.svelte';
  import EmptyState from '$lib/widgets/display/EmptyState.svelte';
  import type { LayoutInput } from '../layout-adapter.js';

  interface Props {
    input: LayoutInput;
    onSelect?: (id: string) => void;
  }

  let { input, onSelect }: Props = $props();

  // The raw spec data — items are the things to compare, features are optional.
  const rawData = $derived(
    (input.spec as unknown as { data?: Record<string, unknown> }).data ?? {},
  );

  const items = $derived(
    Array.isArray((rawData as any).items)
      ? ((rawData as any).items as Record<string, unknown>[])
      : input.items,
  );

  const features = $derived(
    Array.isArray((rawData as any).features) ? (rawData as any).features : undefined,
  );
</script>

{#if items.length === 0}
  <EmptyState
    title="Nothing to compare"
    description="Add items to compare them side by side."
    icon="columns"
  />
{:else}
  <!-- Adapter boundary: `items` is raw spec data (Record<string, unknown>[]).
       The ComparisonLayout composite defensively handles item shape, so assert
       the structural CompareItem shape here rather than reshaping the data. -->
  <ComparisonLayout
    title={input.title}
    description={input.description}
    items={items as ({ id: string } & Record<string, unknown>)[]}
    {features}
    onselect={onSelect}
  />
{/if}
