<!--
  TimelineLayout.svelte — designed chronological-timeline layout (Wave 3: ported layouts).
  Created 2026-06-07.
  Ripple-native port of ocean-flow's TimelineLayout. Instead of re-implementing
  the rail/dot/connector markup with shadcn + genesis IconWidget, this COMPOSES
  ripple's existing `Timeline` widget (widgets/research/Timeline.svelte) — one
  source of truth for timeline chrome.

  Routed for the `timeline` display hint (display.layout='timeline'). The adapter
  feeds structured `items`; this maps each item (via the field mapping) to the
  Timeline widget's {date, title, detail, type} event shape. PURE — reads only
  `input` from the adapter, no fetch / service. No top-level $state (renders as a
  child only; avoids the repo's mounted-entry $state flake).
-->
<script lang="ts">
  import Timeline from '$lib/widgets/research/Timeline.svelte';
  import EmptyState from '$lib/widgets/display/EmptyState.svelte';
  import type { LayoutInput } from '../layout-adapter.js';

  interface Props {
    input: LayoutInput;
  }

  let { input }: Props = $props();

  const fields = $derived(input.fields);
  const items = $derived(input.items);

  function field(item: Record<string, unknown>, key: string): unknown {
    const mapped = fields[key];
    return mapped ? item[mapped] : undefined;
  }

  function asString(v: unknown): string {
    return v == null ? '' : String(v);
  }

  // Map the adapter's generic items to the Timeline widget's event shape. The
  // date reads from the field-mapped `subtitle` (genesis put dates there) or a
  // literal `date` key; the body reads `description`.
  const events = $derived(
    items.map((item) => ({
      date: asString(field(item, 'subtitle') ?? item.date),
      title: asString(field(item, 'title') ?? item.title),
      detail: asString(field(item, 'description') ?? item.description) || undefined,
      type: (item.type as 'default' | 'success' | 'warning' | 'error' | 'info') ?? 'default',
      color: item.color as string | undefined,
    })),
  );
</script>

{#if events.length === 0}
  <EmptyState title="No events" description="There's nothing on this timeline yet." icon="clock" />
{:else}
  <div class="timeline-layout">
    {#if input.title}
      <h2 class="timeline-layout__title">{input.title}</h2>
    {/if}
    {#if input.description}
      <p class="timeline-layout__description">{input.description}</p>
    {/if}
    <Timeline {events} />
  </div>
{/if}

<style>
  .timeline-layout {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .timeline-layout__title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--ripple-foreground, inherit);
  }
  .timeline-layout__description {
    font-size: 0.875rem;
    color: var(--ripple-muted-foreground, inherit);
  }
</style>
