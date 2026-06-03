---
{
  "title": "Timeline: Chronological Event List with Color-Coded Dots",
  "summary": "Timeline renders a vertical list of dated events connected by a continuous rail line — each event has a colored dot, date label, title, and optional detail text. It supports five semantic dot types plus custom color overrides, truncation via maxItems, and a trailing overflow indicator.",
  "concepts": [
    "timeline",
    "vertical timeline",
    "chronological events",
    "dot color",
    "semantic type",
    "rail connector",
    "flex:1 line",
    "truncation maxItems",
    "overflow indicator",
    "date label typography"
  ],
  "categories": [
    "widget",
    "research",
    "data-visualization",
    "layout"
  ],
  "source_docs": [
    "e3cf1d4035771680"
  ],
  "backlinks": null,
  "word_count": 558,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Timeline` is a chronological visualization widget for event sequences in research responses — earnings history, corporate actions, product launches, regulatory milestones, or any ordered sequence of dated events. It is more structured than a prose list while being lighter-weight than a full chart.

## Props

```svelte
interface TimelineEvent {
  date: string;                                            // Date or time label
  title: string;                                          // Event title
  detail?: string;                                        // Optional body text
  type?: 'default' | 'success' | 'warning' | 'error' | 'info';
  color?: string;                                         // Custom dot color
}

interface Props {
  events: TimelineEvent[];
  maxItems?: number;
  class?: string;
}
```

## Dot Color Resolution

```svelte
const typeColors = {
  default: 'hsl(var(--muted-foreground))',
  success: '#22c55e',
  warning: '#f59e0b',
  error:   '#ef4444',
  info:    '#3b82f6',
};

function dotColor(ev: TimelineEvent): string {
  if (ev.color) return ev.color;
  return typeColors[ev.type ?? 'default'];
}
```

The priority is `ev.color` → `typeColors[ev.type]` → `typeColors.default`. This layered resolution lets callers use semantic type names for common patterns while retaining the ability to override with an exact color for special events (e.g. a company-specific brand color for a founding event).

`default` uses `hsl(var(--muted-foreground))` — a theme-adaptive gray — while typed events use hardcoded semantic colors. The asymmetry is intentional: default events should blend with the theme; warning, error, success events should maintain consistent meaning regardless of theme.

## Rail Connector

```svelte
{#if i < visible.length - 1}
  <span class="rtl-line"></span>
{/if}
```

The vertical line connecting dots only renders between adjacent events — there is no trailing line after the last item. This is the correct behavior for a vertical timeline: the line should terminate at the final event, not extend into empty space.

The line is `flex: 1` within the rail column, allowing it to stretch to fill the height between dots regardless of how tall the event content is.

## Truncation

```svelte
const visible = $derived(maxItems ? events.slice(0, maxItems) : events);
```

With `maxItems` set, only the first N events are rendered. A trailing overflow indicator shows how many events were hidden:

```svelte
{#if maxItems && events.length > maxItems}
  <div class="rtl-more">+{events.length - maxItems} more</div>
{/if}
```

The overflow indicator is deliberately non-interactive — clicking "+ more" to expand the list is not implemented. This is appropriate for generative UI: if more events are needed, the AI should regenerate with a higher `maxItems` value or a new widget.

## Date Label Typography

```css
.rtl-date {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-family: monospace;
}
```

Date labels use uppercase monospace with tracking — mimicking the cap-height date stamps in financial research PDFs and annual reports. This gives the timeline a document-grade aesthetic that raw lowercase dates lack.

## Rail Layout

Each timeline item is a horizontal flex row: a fixed `12px`-wide rail column (dot + line) on the left, and the content block on the right. The rail uses `padding-top: 4px` to vertically align the dot center with the first line of the title text.

The content block has `padding-bottom: 16px` to create consistent vertical spacing between events, which also gives the connecting line the height it needs to span the gap.

## Known Gaps

- The `+N more` overflow indicator is not interactive — no expand or load-more behavior.
- Events are not sorted — the caller must pre-sort by date. The component has no built-in chronological ordering, which means an unsorted `events` array will render visually as if that order is chronological.