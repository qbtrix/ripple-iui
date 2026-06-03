---
{
  "title": "SourceCard: Compact Source Attribution Card with Headline",
  "summary": "SourceCard is a small card that pairs a favicon (with dot fallback) and source name with a headline — designed for horizontal citation strips where sources are surfaced as individual tappable cards. It follows the same favicon-error-fallback and conditional-interactivity patterns as Citation and NewsCard.",
  "concepts": [
    "source card",
    "citation card",
    "horizontal citation strip",
    "favicon fallback",
    "favicon error handling",
    "dot fallback",
    "line clamp",
    "source attribution",
    "conditional interactivity"
  ],
  "categories": [
    "widget",
    "research",
    "citations",
    "interactive"
  ],
  "source_docs": [
    "2a1b3d5cb814b8f2"
  ],
  "backlinks": null,
  "word_count": 444,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`SourceCard` sits between `Citation` (an inline chip) and `NewsCard` (a full list row). It is a standalone card-format source reference — showing the publication's favicon and name alongside a headline or article title. It is most naturally used in a horizontal-scrolling `Sources` row that appears at the end of an AI research response.

## Props

```svelte
interface Props {
  source: string;        // Required — publisher name
  title: string;         // Required — headline or article title
  color?: string;        // Dot fallback color
  favicon?: string;      // Override favicon
  url?: string;
  class?: string;
  onclick?: (e?: unknown) => void;
}
```

Both `source` and `title` are required — the card cannot render meaningfully without both. All other props are optional.

## Favicon Resolution and Fallback

```svelte
const iconSrc = $derived(favicon ?? faviconUrl(source));
let iconError = $state(false);
```

The pattern mirrors `Citation.svelte` exactly: derive the icon URL from `favicon` override or `faviconUrl()` lookup, then swap to a colored dot on `onerror`. The dot uses a slightly larger size (`14×14px`) than Citation's dot (`8×8px`) because the card's body section is more spacious.

```svelte
{:else}
  <span class="rsrc-card-dot" style="background:{color}"></span>
```

This fallback prevents a broken-image icon from appearing in a published citation strip when the Google favicon service is unavailable or rate-limited.

## Conditional Interactivity

The card uses the standard pattern:

```svelte
role={onclick || url ? 'button' : undefined}
tabindex={onclick || url ? 0 : undefined}
```

Hover styling activates only on cards that have interaction targets:

```css
.rsrc-card[role='button']:hover {
  border-color: hsl(var(--primary) / 0.4);
  box-shadow: 0 1px 4px hsl(var(--primary) / 0.08);
}
```

The hover shadow uses the primary color at very low opacity — barely perceptible, but enough to create a tactile lift effect consistent with the design system.

## Title Truncation

```css
.rsrc-card-title {
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

Two-line title clamping keeps cards in a horizontal strip uniform in height. Without it, long headlines would cause some cards to be significantly taller than others, breaking grid alignment.

## Source Name Truncation

```css
.rsrc-card-source {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

The source name uses single-line `text-overflow: ellipsis`. Long publisher names (e.g. "The Times of India") are truncated rather than wrapping, because the source line is the secondary information — the favicon already identifies the publication.

## Card Sizing

```css
.rsrc-card {
  min-width: 160px;
  max-width: 200px;
  flex-shrink: 0;
}
```

Slightly smaller than `DiscoverCard` (160–200px vs 180–240px) because SourceCards don't have thumbnail images and are denser elements.

## Known Gaps

- Identical favicon fallback logic appears in `Citation.svelte`, `NewsCard.svelte`, `CompanyHeader.svelte`, and `SourceCard.svelte`. There is no shared `FaviconImage` sub-component that centralizes this pattern, creating four divergent copies of the same error-handling code.