---
{
  "title": "Metric Widget — KPI Display with Trend Badge and Layout Variants",
  "summary": "A focused display widget for key performance indicators, rendering a labeled numeric value alongside an optional trend badge that automatically applies semantic color (positive green, negative red, neutral gray) based on the trend string's leading sign character. Supports three layout variants for different dashboard density requirements.",
  "concepts": [
    "KPI",
    "metric display",
    "trend badge",
    "tabular numbers",
    "layout variants",
    "semantic color",
    "dashboard",
    "font-mono",
    "Svelte 5 derived"
  ],
  "categories": [
    "widget",
    "display",
    "data"
  ],
  "source_docs": [
    "ba578433b35d81bc"
  ],
  "backlinks": null,
  "word_count": 499,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Dashboards built by AI agents frequently need to surface KPIs — download counts, revenue figures, uptime percentages, queue depths. The Metric widget provides a standardized display for these values that includes semantic trend communication without requiring the spec author to specify colors or badge variants explicitly.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Descriptor shown above or beside the value |
| `value` | `string \| number` | The primary displayed value |
| `trend` | `string` | Optional trend indicator (e.g., `"+12%"`, `"-3.4%"`) |
| `description` | `string` | Optional secondary text (default variant only) |
| `variant` | `'default' \| 'compact' \| 'horizontal'` | Layout mode |

## Trend Variant Derivation

The trend badge variant is derived from the first character of the `trend` string:

```typescript
const trendVariant = $derived(
  trend?.startsWith('+') ? 'default' as const
  : trend?.startsWith('-') ? 'destructive' as const
  : 'secondary' as const
);
```

- `+` prefix → `default` badge (primary color, typically blue/accent — indicating positive movement)
- `-` prefix → `destructive` badge (red — indicating decline)
- Anything else (neutral, `=`, no prefix) → `secondary` badge (muted — indicating no significant change)

This convention means spec authors write human-readable strings like `"+4.2% this week"` and get correct visual semantics automatically, without specifying a color.

## Layout Variants

### Default
Vertical stack: small muted label on top, large bold value in the middle (with trend badge inline), optional description text at the bottom. Suited for card headers and standalone KPI tiles.

### Compact
Baseline-aligned row: large value left, trend badge center, label right-aligned. Suited for dense lists of metrics where vertical space is scarce.

### Horizontal
Label left, value + trend right in a flex row. Suited for settings panels, comparison tables, or any list where label–value pairs are vertically stacked in a narrow column.

## Typography Choices

All three variants use `font-mono tabular-nums` for the value. Tabular numbers ensure that updating values (e.g., in a live-updating dashboard) don't cause layout shifts from digit-width variation — `1` and `8` occupy the same width in tabular mode.

The default variant uses `text-2xl font-bold` for the value, making it the visual anchor of a card. The compact variant uses `text-lg` for tighter panels.

## Integration with Badge

The trend is rendered using Ripple's own `Badge` component (from shadcn) with tightly packed styling (`text-[10px] px-1.5 py-0`). This sizing keeps the badge visually subordinate to the primary value — it signals direction without competing for attention.

## Known Gaps

- **Trend parsing is prefix-only**: The derivation only checks the first character. A trend string like `"flat"` or `"N/A"` correctly falls through to secondary, but a string starting with `(` or a space before the sign would also fall through. This is acceptable for the current use case but could confuse custom trend strings.
- **No sparkline integration**: The Metric widget has no built-in mini chart. Combining a Metric with a Chart (sparkline type) requires external layout coordination.