<!--
  ResultsSummary.svelte — RIPPLE-NATIVE organism (Wave 2: organisms).
  Created 2026-06-07.
  Adapted from ocean-flow's organisms/ResultsSummary.svelte, rewired off genesis
  IconWidget/shadcn onto ripple's display/Icon + design tokens. The genesis
  quiz-score block is intentionally dropped here — that lives in QuizQuestion; this
  organism is the domain-agnostic confirm/review summary the SummaryLayout composes.

  A labelled key→value review: a card of summary rows (optional leading icon,
  optional highlight) plus an optional emphasised total row. Pure presentation —
  props in, UI out. No data fetching, no services.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Icon from '$lib/widgets/display/Icon.svelte';

  interface SummaryItem {
    label: string;
    value: string;
    /** Lucide icon slug (kebab-case) for the leading tile. */
    icon?: string;
    /** Render the value in the accent colour. */
    highlight?: boolean;
  }

  interface TotalRow {
    label: string;
    value: string;
  }

  interface Props {
    title?: string;
    items: SummaryItem[];
    /** Optional emphasised total row pinned below the items. */
    total?: TotalRow;
    class?: string;
  }

  let { title, items, total, class: className }: Props = $props();
</script>

<div class={cn('flex flex-col gap-4', className)}>
  {#if title}
    <h3 class="text-lg font-semibold tracking-tight text-ripple-surface-foreground">
      {title}
    </h3>
  {/if}

  {#if items.length > 0}
    <div
      class="divide-y divide-ripple-border/40 overflow-hidden rounded-ripple border border-ripple-border/60 bg-ripple-surface shadow-sm"
      role="list"
      aria-label={title ?? 'Summary'}
    >
      {#each items as item (item.label)}
        <div
          class="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-ripple-muted/40"
          role="listitem"
        >
          <div class="flex min-w-0 flex-1 items-center gap-3">
            {#if item.icon}
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ripple-muted text-muted-foreground transition-transform duration-200 group-hover:scale-105"
              >
                <Icon name={item.icon} size={18} />
              </div>
            {/if}
            <span class="truncate text-sm font-medium text-muted-foreground">
              {item.label}
            </span>
          </div>

          <span
            class={cn(
              'shrink-0 text-right text-base font-semibold',
              item.highlight ? 'text-ripple-accent' : 'text-ripple-surface-foreground',
            )}
          >
            {item.value}
          </span>
        </div>
      {/each}

      {#if total}
        <div
          class="flex items-center justify-between gap-4 bg-ripple-muted/30 px-5 py-4"
          role="listitem"
        >
          <span class="text-sm font-semibold text-ripple-surface-foreground">
            {total.label}
          </span>
          <span class="text-lg font-bold text-ripple-accent">{total.value}</span>
        </div>
      {/if}
    </div>
  {/if}
</div>
