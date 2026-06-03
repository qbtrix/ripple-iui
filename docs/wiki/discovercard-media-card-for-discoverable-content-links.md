---
{
  "title": "DiscoverCard: Media Card for Discoverable Content Links",
  "summary": "DiscoverCard renders a compact card with a 16:10 thumbnail image, title, description, and source label — designed to be placed in horizontal scroll strips to surface recommended articles, topics, or related content. It activates as a button when a URL or click handler is provided.",
  "concepts": [
    "discover card",
    "media card",
    "horizontal scroll strip",
    "thumbnail",
    "aspect ratio 16:10",
    "line clamp",
    "flex-shrink",
    "conditional interactivity",
    "discoverable content"
  ],
  "categories": [
    "widget",
    "research",
    "interactive",
    "content"
  ],
  "source_docs": [
    "20955c4a05188ae9"
  ],
  "backlinks": null,
  "word_count": 456,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`DiscoverCard` is a media-forward card component used to present discoverable content items — articles, topics, products, or related searches — within AI-generated research responses. It has a fixed min/max width (`180px–240px`) and is `flex-shrink: 0`, making it ideal for horizontal scroll strips where cards should never compress.

## Props

```svelte
interface Props {
  image?: string;      // Thumbnail URL
  title: string;       // Required
  description?: string;
  source?: string;     // Publisher attribution
  url?: string;
  class?: string;
  onclick?: (e?: unknown) => void;
}
```

Only `title` is required. The image, description, and source are all optional — the card degrades gracefully from a rich media card down to a title-only chip.

## Layout

The card uses a vertical flex column with the image on top and the text body below. The image wrapper uses `aspect-ratio: 16/10` — slightly wider than the standard 16:9 — to give thumbnails a letterbox look that feels editorial rather than video-like.

```css
.rdisc-img-wrap {
  width: 100%;
  aspect-ratio: 16/10;
  overflow: hidden;
}
.rdisc-img {
  object-fit: cover;
}
```

The `overflow: hidden` on the wrapper clips any images whose natural dimensions don't match the aspect ratio, preventing layout blowout.

## Interactive Behavior

Like other research widgets, the card conditionally becomes interactive:

```svelte
role={onclick || url ? 'button' : undefined}
tabindex={onclick || url ? 0 : undefined}
```

Hover styling — a subtle primary-tinted border and a soft box-shadow — only activates when `role="button"` is present, ensuring passive cards don't show misleading pointer affordances.

## Text Truncation

Both the title and description use `-webkit-line-clamp: 2` for two-line truncation:

```css
display: -webkit-box;
-webkit-line-clamp: 2;
line-clamp: 2;
-webkit-box-orient: vertical;
overflow: hidden;
```

The non-prefixed `line-clamp: 2` is included alongside the prefixed version for future standards compliance. Clamping at two lines is a deliberate product choice — cards in a scroll strip should be scannable, not readable.

## Source Attribution

The `source` field renders at 10px with reduced opacity, positioned at the bottom of the body. This mirrors the visual hierarchy of news thumbnails — the publisher credit is the least prominent element because it's the least relevant for discovery browsing.

## Card Sizing

```css
.rdisc {
  min-width: 180px;
  max-width: 240px;
  flex-shrink: 0;
}
```

The hard size bounds exist to keep horizontal scroll strips predictable. Without `flex-shrink: 0`, cards in a flex container would compress to fill available space, breaking the horizontal scroll UX pattern.

## Known Gaps

- No image loading error handling — if the thumbnail URL is broken, the browser's default broken-image icon displays. A fallback placeholder (similar to how `CompanyHeader` handles logo errors) would make the component more robust.
- The card is not aria-labeled with the full title when `role="button"`, meaning screen readers announce only the implicit button text, which may be truncated.