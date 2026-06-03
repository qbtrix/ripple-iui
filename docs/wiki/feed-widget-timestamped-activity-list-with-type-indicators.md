---
{
  "title": "Feed Widget — Timestamped Activity List with Type Indicators",
  "summary": "A compact vertical feed component that renders a list of activity items — each with a colored dot, text, and optional timestamp — suitable for audit logs, notification streams, event histories, and agent activity panels. Dot colors are driven by semantic type values or custom color overrides.",
  "concepts": [
    "activity feed",
    "event log",
    "timestamped list",
    "dot indicator",
    "semantic type colors",
    "maxItems",
    "audit trail",
    "notification stream",
    "tabular numbers"
  ],
  "categories": [
    "widget",
    "display"
  ],
  "source_docs": [
    "30846fc5f1fc3f55"
  ],
  "backlinks": null,
  "word_count": 412,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Many AI agent UIs need to display a stream of events in chronological order — tool calls, state transitions, user actions, system messages. The Feed widget provides a styled container for this pattern: a vertical list where each row has a semantic dot, a text body, and an optional timestamp. The design is compact enough to fit inside a narrow card column.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `FeedItem[]` | `[]` | Array of feed entries |
| `maxItems` | `number` | — | If set, only the first N items are rendered |
| `class` | `string` | — | Additional CSS classes |

Each `FeedItem` carries:
- `text` — the display string (required)
- `time` — optional timestamp string, shown right-aligned in monospace
- `dot` — optional explicit CSS color for the dot
- `type` — optional semantic type: `'success' | 'warning' | 'error' | 'info' | 'default'`

## Dot Color Resolution

The `getDotColor()` function applies a priority chain:

1. **Explicit `dot` color** — direct CSS value takes precedence, enabling fully custom branding
2. **Semantic `type`** — mapped to CSS custom property colors:
   - `success` → `--chart-2` (green)
   - `warning` → `--chart-4` (yellow/amber)
   - `error` → `--destructive` (red)
   - `info` → `--chart-1` (blue)
3. **Default** — `--muted-foreground` (gray)

Using `hsl(var(--chart-N))` values instead of hardcoded hex colors ensures the dots adapt to theme changes without component updates.

## maxItems Slicing

```typescript
const visibleItems = $derived(maxItems ? items.slice(0, maxItems) : items);
```

This prevents a long feed from overwhelming a card-sized container. The truncation happens in the derived value so it is reactive — updating `maxItems` at runtime (e.g., expanding a "show more" section) will immediately re-derive the visible set.

## Styling Details

- The last item's bottom border is suppressed with `:last-child { border-bottom: none }` — preventing a visual double-border when the feed is inside a bordered card.
- Timestamps use `font-variant-numeric: tabular-nums` so columns of timestamps align vertically even when digits have different widths.
- `min-width: 0` on `.rfeed-text` prevents flex-child overflow when long unbroken strings are present.

## Known Gaps

- **No pagination or virtualization**: `maxItems` only shows the first N items; there is no "load more" or virtual scroll. For infinite streams, the caller must manage the array size externally.
- **Items are append-only by design**: The component renders items in order without reverse-chronological support. A feed showing newest-first requires the caller to sort before passing.