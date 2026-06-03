---
{
  "title": "NewsCard: Scannable News Item Row with Sentiment Badge",
  "summary": "NewsCard renders a news article as a list row with source favicon, publisher name, timestamp, optional sentiment badge (bullish/bearish/neutral), truncated headline, and thumbnail image. It is designed for dense news feed layouts where multiple items stack vertically, with separators between items and the last item having no bottom border.",
  "concepts": [
    "news card",
    "news feed row",
    "sentiment badge",
    "bullish bearish neutral",
    "favicon",
    "headline truncation",
    "last-child border removal",
    "financial news",
    "thumbnail image",
    "list divider"
  ],
  "categories": [
    "widget",
    "research",
    "news",
    "finance"
  ],
  "source_docs": [
    "a24fda8ea2879e5f"
  ],
  "backlinks": null,
  "word_count": 516,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`NewsCard` is the building block for financial and general news feeds within Ripple research responses. Rather than a card with a prominent image, it uses a compact row layout — a content body on the left and an optional thumbnail on the right — matching the visual pattern of Bloomberg Terminal, Reuters, and major financial news apps.

## Props

```svelte
interface Props {
  headline: string;                              // Required
  source: string;                                // Required
  time?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  image?: string;                                // Thumbnail
  url?: string;
  class?: string;
  onclick?: (e?: unknown) => void;
}
```

## Sentiment Badge

The sentiment system maps three states to distinct color-coded badges:

```svelte
const sentimentConfig = {
  bullish: { label: 'Bullish', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  bearish: { label: 'Bearish', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  neutral: { label: 'Neutral', color: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--muted) / 0.3)' },
};
```

The `neutral` sentiment intentionally uses CSS variables rather than hardcoded RGB — it should adapt to the theme. Bullish (green) and bearish (red) use hardcoded colors because financial color conventions are universal and should not theme-drift.

The badge is pushed to the right of the source row via `margin-left: auto`, ensuring it always aligns to the trailing edge regardless of how long the source name and timestamp are.

## Favicon Fallback

```svelte
const iconSrc = $derived(faviconUrl(source));
let iconError = $state(false);
```

Unlike `Citation.svelte`, which shows a colored dot fallback, `NewsCard` simply hides the favicon entirely on error — there is no `{:else}` branch. The source name label provides sufficient attribution without a visual icon. This is a lighter fallback choice, appropriate for compact list rows where real estate is tighter.

## List Row Design

Each `NewsCard` instance has a bottom border that acts as a list divider:

```css
.rnews {
  border-bottom: 1px solid hsl(var(--border) / 0.5);
}
.rnews:last-child {
  border-bottom: none;
}
```

The `:last-child` rule removes the trailing border on the final item, preventing the visual double-border that would appear if the card list is inside a container with its own border.

## Headline Truncation

```css
.rnews-headline {
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
```

Headlines are clamped at two lines. Two lines is the standard for news feed headlines — enough to convey meaning while keeping item heights consistent for predictable list layouts.

## Thumbnail

The thumbnail (`72×52px`) renders on the trailing edge of the row. It does not have an error fallback — if the image fails to load, the broken image area collapses naturally since no fixed height is set on the image element itself.

## Conditional Interactivity

As with other research widgets, the card activates as `role="button"` only when `url` or `onclick` is provided. Hover state adds a subtle muted background tint to confirm interactivity without disrupting the reading layout.

## Known Gaps

- No favicon fallback rendering on error — the favicon area disappears rather than showing a placeholder dot. Inconsistent with Citation's behavior.
- Thumbnail does not have an error fallback, and its fixed display dimensions (`72×52px`) could show a broken-image icon rather than nothing if the browser renders broken images with fixed intrinsic size.