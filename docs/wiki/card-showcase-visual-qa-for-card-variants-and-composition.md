---
{
  "title": "Card Showcase — Visual QA for Card Variants and Composition",
  "summary": "A dedicated visual QA page for the Ripple Card widget, covering all four visual variants, two density modes, interactive state, header/footer snippet slots, and a full composition example that embeds a Stat widget.",
  "concepts": [
    "Card widget",
    "visual QA",
    "variants",
    "density",
    "interactive card",
    "header slot",
    "footer slot",
    "Svelte snippets",
    "Stat composition",
    "accessibility",
    "hairline border"
  ],
  "categories": [
    "showcase",
    "widget",
    "layout"
  ],
  "source_docs": [
    "10cd42e7c93d2428"
  ],
  "backlinks": null,
  "word_count": 328,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`routes/showcase/card/+page.svelte` tests the `Card` layout widget in isolation, using direct Svelte imports rather than the Ripple spec renderer. The page is structured to verify every configurable dimension of the card, matching a design spec referenced internally as "treatment A (hairline)."

## Sections Covered

### Variants
Four visual treatments in a 2×2 grid:

| Variant | Treatment |
|---------|-----------|
| `default` | `border border-border` on `bg-card` |
| `muted` | `border border-border` on `bg-muted` |
| `outlined` | hairline border at `foreground/15` opacity |
| `selected` | `ring-1 ring-inset ring-primary` overlay |

The `outlined` variant is the lightest possible treatment — barely-there border for grouped content. The `selected` variant uses a primary-color inset ring to signal active selection without changing the card background.

### Density
Two padding modes:
- **compact** (default) — `gap-2 p-4`, tighter layout
- **comfortable** — `gap-3 p-5`, more breathing room

This dimension exists because cards appear in both dense data tables (compact) and content-focused layouts (comfortable).

### Interactive
```svelte
<Card
  title="Interactive"
  interactive
  onclick={() => console.log('card clicked')}
>
```

When `interactive` and `onclick` are both present, the card renders as a `<button>` element, making it keyboard-focusable and activatable with Enter/Space. Without the `interactive` prop, an `onclick` handler would work for mouse users but be invisible to keyboard and screen-reader users.

### Header and Footer Slots
Svelte snippet slots let consumers inject arbitrary content into the card header or footer:
```svelte
{#snippet header()}<Badge text="New" variant="success" />{/snippet}
{#snippet footer()}<p>Updated 2m ago</p>{/snippet}
```

This avoids an explosion of dedicated props for every possible header/footer content pattern.

### Full Composition
A complete example combines Card + Stat inside the card's `header` slot — demonstrating how a metric card (the most common dashboard pattern) looks in practice.

## Known Gaps

The showcase does not test cards with long text overflow, which would reveal whether the card handles text truncation or simply expands. There is no test for `variant="selected"` in combination with `interactive` — a common pattern in selection lists.