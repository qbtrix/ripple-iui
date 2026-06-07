<!--
  InfoHeroLayout.svelte — designed info display for intent='info' (Wave 3: layouts).
  Created 2026-06-07.
  Adapted from ocean-flow's InfoHeroLayout, rewired off shadcn/IconWidget onto
  RIPPLE display widgets (Metric, Stat, Heading, Text, Icon). Three modes driven by
  item count:
    - HERO  (0–1 items): one large prominent metric (Metric widget).
    - PANEL (2–4 items):  a key/value list (Metric horizontal rows).
    - GRID  (5+ items):   a responsive grid of Stat cards.
  An optional description renders above. Reads the value/label/icon/trend per item
  via the adapter's field mapping (falling back to common keys).

  PURE: reads only the adapter's `input`; no fetch, no service.
-->
<script lang="ts">
  import Metric from '$lib/widgets/display/Metric.svelte';
  import Stat from '$lib/widgets/display/Stat.svelte';
  import Text from '$lib/widgets/display/Text.svelte';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import EmptyState from '$lib/widgets/display/EmptyState.svelte';
  import type { LayoutInput } from '../layout-adapter.js';

  interface Props {
    input: LayoutInput;
  }

  let { input }: Props = $props();

  const fields = $derived(input.fields);
  const items = $derived(input.items);
  const description = $derived(input.description);

  function field(item: Record<string, unknown>, key: string): unknown {
    const mapped = fields[key];
    return mapped ? item[mapped] : undefined;
  }
  function valueOf(item: Record<string, unknown>): string | number {
    const v = field(item, 'value') ?? item.value;
    return (typeof v === 'string' || typeof v === 'number') ? v : (v == null ? '—' : String(v));
  }
  function labelOf(item: Record<string, unknown>): string {
    return String(field(item, 'subtitle') ?? field(item, 'title') ?? item.label ?? item.title ?? '');
  }
  function iconOf(item: Record<string, unknown>): string | undefined {
    const i = field(item, 'icon') ?? item.icon;
    return i == null ? undefined : String(i);
  }
  function trendOf(item: Record<string, unknown>): string | undefined {
    const t = item.trend;
    return t == null ? undefined : String(t);
  }

  type Mode = 'hero' | 'panel' | 'grid';
  const mode = $derived<Mode>(
    items.length <= 1 ? 'hero' : items.length <= 4 ? 'panel' : 'grid',
  );
  const hasItems = $derived(items.length > 0);
</script>

<div class="flex flex-col gap-5">
  {#if description}
    <Text text={description} size="sm" class="max-w-prose leading-relaxed" />
  {/if}

  {#if !hasItems}
    <EmptyState title="No information available" description="There's no data to display right now." icon="inbox" />
  {:else if mode === 'hero'}
    {@const item = items[0]}
    <div class="relative overflow-hidden rounded-ripple border border-ripple-border/60 bg-ripple-surface p-8 shadow-sm">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-4">
          {#if iconOf(item)}
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ripple-accent/10 text-ripple-accent">
              <Icon name={iconOf(item) ?? ''} size={28} />
            </div>
          {/if}
          <Metric label={labelOf(item)} value={valueOf(item)} trend={trendOf(item)} class="[&_span:last-child]:text-5xl" />
        </div>
      </div>
    </div>
  {:else if mode === 'panel'}
    <div class="divide-y divide-ripple-border/40 overflow-hidden rounded-ripple border border-ripple-border/60 bg-ripple-surface shadow-sm">
      {#each items as item, i (i)}
        <div class="flex items-center gap-3 px-5 py-4">
          {#if iconOf(item)}
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ripple-muted text-muted-foreground">
              <Icon name={iconOf(item) ?? ''} size={20} />
            </div>
          {/if}
          <Metric variant="horizontal" label={labelOf(item)} value={valueOf(item)} trend={trendOf(item)} class="flex-1" />
        </div>
      {/each}
    </div>
  {:else}
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {#each items as item, i (i)}
        <div class="rounded-ripple border border-ripple-border/60 bg-ripple-surface p-4 shadow-sm">
          <Stat label={labelOf(item)} value={valueOf(item)} />
        </div>
      {/each}
    </div>
  {/if}
</div>
