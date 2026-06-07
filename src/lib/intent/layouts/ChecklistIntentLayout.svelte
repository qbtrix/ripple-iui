<!--
  ChecklistIntentLayout.svelte — intent-layout wrapper for ChecklistLayout composite.
  Created 2026-06-07.
  Routes `display.layout='checklist'` specs to the ripple ChecklistLayout composite
  widget. Reads checklist items from `spec.data.items`; each item must carry at
  minimum `{id, label}`. The composite adds progress bar, owner/due/blocked chrome.
  PURE — no fetch. No top-level $state (child-only; avoids repo $state flake).
-->
<script lang="ts">
  import ChecklistLayout from '$lib/widgets/composite/ChecklistLayout.svelte';
  import EmptyState from '$lib/widgets/display/EmptyState.svelte';
  import type { LayoutInput } from '../layout-adapter.js';

  interface Props {
    input: LayoutInput;
  }

  let { input }: Props = $props();

  // Checklist items live in data.items; fall back to the adapter's generic items.
  const rawData = $derived(
    (input.spec as unknown as { data?: Record<string, unknown> }).data ?? {},
  );

  const checklistItems = $derived(
    Array.isArray((rawData as any).items)
      ? ((rawData as any).items as Record<string, unknown>[])
      : input.items,
  );
</script>

{#if checklistItems.length === 0}
  <EmptyState
    title="No tasks"
    description="This checklist has no items yet."
    icon="check-square"
  />
{:else}
  <ChecklistLayout
    title={input.title}
    description={input.description}
    items={checklistItems as any}
    showProgress
  />
{/if}
