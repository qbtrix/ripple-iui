---
{
  "title": "CompanyHeader: Company Identity and Live Price Block",
  "summary": "CompanyHeader renders a full company identity card combining logo (with Clearbit auto-fetch and initial fallback), name, ticker, exchange badge, description, sector tags, live price, and price change — all from a single composable widget. It is the canonical top-of-widget header for stock and company research responses.",
  "concepts": [
    "company header",
    "stock ticker",
    "Clearbit logo",
    "logo fallback",
    "price change direction",
    "exchange badge",
    "market cap",
    "sector tags",
    "tabular numerals",
    "JetBrains Mono",
    "Svelte 5 derived state"
  ],
  "categories": [
    "widget",
    "research",
    "finance",
    "layout"
  ],
  "source_docs": [
    "abc1daa73294cbad"
  ],
  "backlinks": null,
  "word_count": 523,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`CompanyHeader` is the primary identity block for company-focused research responses in Ripple. When an AI generates a company profile widget, this component assembles a visually complete header from a rich but mostly optional prop set — only `name` is required. Everything else degrades gracefully.

## Props

```svelte
interface Props {
  name: string;           // Required
  ticker?: string;
  exchange?: string;      // e.g. "NSE", "NYSE"
  description?: string;
  logo?: string;          // Explicit logo URL
  domain?: string;        // Domain for Clearbit auto-logo
  tags?: string[];        // Sector / industry chips
  price?: string;
  change?: string;        // e.g. "+12.50"
  changePercent?: string; // e.g. "+1.24%"
  marketCap?: string;
  class?: string;
}
```

## Logo Resolution with Layered Fallback

Logo fetching uses a two-level strategy:

```svelte
const logoSrc = $derived(
  logo ?? (domain ? `https://logo.clearbit.com/${domain}` : undefined)
);
let logoError = $state(false);
```

If neither `logo` nor `domain` is provided, `logoSrc` is `undefined` and the fallback initial renders immediately. If Clearbit returns a 404 or network error, `onerror` fires and `logoError` flips, rendering the initial fallback:

```svelte
{:else}
  <div class="rch-logo-fallback">{name.charAt(0)}</div>
```

This three-path behavior (explicit URL → Clearbit → initial) is important because the Clearbit logo CDN is a third-party service. It can be rate-limited, unavailable, or simply not have a logo for a given domain. The initial fallback using the company name's first letter is universally available and recognizable.

## Price Change Direction

The `isPositive` derived state drives color styling:

```svelte
const isPositive = $derived(change ? !change.startsWith('-') : true);
```

A change value that doesn't start with `-` is treated as positive (green). The default when `change` is absent is `true`, which keeps the price block neutral-green rather than red — an important UX choice since showing red on a freshly loaded card before data arrives would be alarming.

Note this is string-based (not numeric) — it mirrors how financial data APIs commonly deliver pre-formatted change strings like `"+12.50"` or `"-3.20"`. Parsing these strings as floats and checking sign would be more robust for edge cases like `"-0.00"`.

## Conditional Meta Row

The tags and market cap row only renders when at least one is present:

```svelte
{#if tags.length > 0 || marketCap}
  <div class="rch-meta">...</div>
{/if}
```

This prevents a dead whitespace gap below the identity block when neither tags nor market cap are provided.

## Exchange Badge

The exchange badge uses uppercase + letter-spacing styling to mimic official exchange typography (NSE, NYSE, NASDAQ). It intentionally avoids color coding exchanges since exchange color conventions vary globally and would require a maintained mapping.

## Typography

The price and change values use a monospace font stack (`JetBrains Mono Variable`, then `SF Mono`, then `ui-monospace`) with `font-variant-numeric: tabular-nums`. This ensures price digits align vertically when multiple rows of prices appear and prevents layout shifting as numbers update in real-time.

## Known Gaps

- The `change` sign-detection uses string prefix matching. A value like `"+0.00"` is treated as positive but visually shows no meaningful movement. A separate `neutral` state for zero change is absent.
- No loading skeleton or placeholder state — the component renders its current data immediately, so initial mount with no price data shows an empty price block rather than a shimmer.