---
{
  "title": "Ticker: Stock Ticker Strip with Symbol, Price, and Change",
  "summary": "Ticker renders one or more stock quotes in a horizontally-scrollable pill strip — each showing symbol, price, and color-coded change value with optional percentage. It uses string prefix detection to determine bullish/bearish coloring, matching how financial data APIs deliver pre-formatted change strings.",
  "concepts": [
    "stock ticker",
    "ticker strip",
    "price display",
    "change direction",
    "isUp helper",
    "tabular numerals",
    "horizontal scroll",
    "flex-shrink",
    "financial widget",
    "monospace typography"
  ],
  "categories": [
    "widget",
    "research",
    "finance",
    "data-display"
  ],
  "source_docs": [
    "844b3cba1d025b38"
  ],
  "backlinks": null,
  "word_count": 489,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Ticker` is a compact financial widget for showing live or snapshot market data across one or more instruments in a single horizontal row. It is designed both for single-ticker display (one instrument's price in context) and for multi-ticker strips (a market summary row showing several related instruments).

## Props

```svelte
interface TickerItem {
  symbol: string;           // e.g. "AAPL", "NIFTY50"
  price: string;            // Pre-formatted price
  change: string;           // e.g. "+12.50" or "-3.20"
  changePercent?: string;   // e.g. "+1.24%"
}

interface Props {
  items: TickerItem[];      // Required
  class?: string;
}
```

All price-related values are strings rather than numbers. This matches how financial data APIs commonly return data — pre-formatted with currency symbols, thousands separators, and locale-appropriate decimal marks. Accepting strings means the component is API-output-ready without requiring a transformation layer.

## Change Direction Detection

```svelte
function isUp(change: string): boolean {
  return !change.trim().startsWith('-');
}
```

The helper function is deliberately simple: anything not starting with `-` is positive. This handles the common API formats:
- `"+12.50"` → up (green)
- `"-3.20"` → down (red)
- `"0.00"` → up (neutral green — no explicit neutral state)
- `"12.50"` → up (positive unsigned values)

The `.trim()` call guards against whitespace-prefixed strings from APIs that pad numeric values.

## Separator Between Items

```svelte
{#each items as item, i}
  {#if i > 0}<span class="rtick-sep"></span>{/if}
  <div class="rtick-item">...</div>
{/each}
```

Separators are rendered as thin vertical `1px` lines between items, using the index check `i > 0` to avoid a leading separator before the first item. This is the correct approach — a CSS `gap` on the parent would not visually match a vertical divider.

## Horizontal Scrolling

```css
.rtick {
  overflow-x: auto;
}
```

The container scrolls horizontally when items exceed the available width. Items are `flex-shrink: 0` to prevent any item from compressing to fit. This is important for a ticker strip — a compressed ticker item with truncated symbol or price would be misleading.

## Typography

All numeric values (price, change) use the monospace font stack with `tabular-nums`:

```css
font-family: "JetBrains Mono Variable", "SF Mono", ui-monospace, monospace;
font-variant-numeric: tabular-nums;
```

This ensures that when multiple tickers are visible side-by-side, their prices and changes maintain consistent character width, which makes rapid visual comparison possible.

## Color Coding

```css
.rtick-up   { color: #22c55e; }
.rtick-down { color: #ef4444; }
```

Hardcoded green/red rather than CSS variable-driven. This is appropriate — financial up/down coloring is a universal convention that should not vary by application theme.

The percentage is shown at 75% opacity (`opacity: 0.75`) within the change span, creating a typographic hierarchy: change amount is primary, percentage is supporting detail.

## Known Gaps

- No `"0"` or flat-change neutral state — zero change is rendered as green (not starting with `-`). A third `rtick-flat` color state (gray) would more accurately represent unchanged prices.
- No item-level click handling or URL linking — tickers are display-only. Adding per-item `onclick` or `url` would require restructuring the `TickerItem` interface.