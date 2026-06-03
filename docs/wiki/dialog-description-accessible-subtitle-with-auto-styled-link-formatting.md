---
{
  "title": "Dialog Description — Accessible Subtitle with Auto-Styled Link Formatting",
  "summary": "DialogDescription wraps bits-ui's `Dialog.Description` primitive to render the dialog's accessible subtitle text. It automatically styles inline anchor links with underlines and hover effects, and exposes its content to ARIA via the primitive's `aria-describedby` wiring.",
  "concepts": [
    "dialog-description",
    "aria-describedby",
    "bits-ui Dialog",
    "muted-foreground",
    "inline link styling",
    "ARIA accessibility",
    "data-slot",
    "text-sm typography",
    "WithElementRef",
    "hover text-foreground"
  ],
  "categories": [
    "widget",
    "dialog",
    "accessibility"
  ],
  "source_docs": [
    "b2f4226eaceee5e8"
  ],
  "backlinks": null,
  "word_count": 371,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`dialog-description.svelte` is the accessible description element for dialog components. It renders secondary explanatory text below the dialog title and connects it to the dialog's ARIA description association, which screen readers announce when the dialog gains focus.

## ARIA Description Wiring

bits-ui's `DialogPrimitive.Description` automatically associates this element with the dialog root via `aria-describedby`. When a user tabs into or opens the dialog, screen readers announce both the dialog title (`aria-labelledby`) and this description. Without a description element, the modal might announce only a title — leaving users without context about what the dialog does.

This is why the component exists as a dedicated primitive rather than just a styled `<p>` tag: the association between description element and dialog root requires coordinated `id`/`aria-describedby` wiring that bits-ui handles internally.

## Typography

```
text-muted-foreground text-sm
```

`text-muted-foreground` renders the description in a subdued color, visually subordinating it to the dialog title and primary content. `text-sm` reduces size slightly — description text in dialogs serves a supporting role and shouldn't compete visually with the action or headline.

## Inline Link Styling

```
*:[a]:underline
*:[a]:underline-offset-3
*:[a]:hover:text-foreground
```

Any `<a>` elements inside the description automatically receive underlines and hover color shift. This matters because dialog descriptions often include contextual links ("Learn more", "See documentation") that consumers add via slot content. Without these styles, links inside the muted-foreground text would be invisible — same color as surrounding text with no underline indicator.

The `hover:text-foreground` shift brings the link to full foreground contrast on hover, making it clearly interactive.

## Props

```svelte
let {
  ref = $bindable(null),
  class: className,
  ...restProps
}: DialogPrimitive.DescriptionProps = $props();
```

Standard ripple pattern: bindable `ref`, class merging, and full attribute pass-through. No `children` prop is declared explicitly because `DialogPrimitive.DescriptionProps` already includes it — the component passes through to the primitive without re-declaring the slot.

## `data-slot` Attribute

`data-slot="dialog-description"` follows the ripple slot identification convention. While the dialog system doesn't currently query for description slot presence in CSS (unlike card's `has-data-[slot=card-footer]` pattern), the attribute enables future layout adaptations and debugging.

## Known Gaps

None. The component is a clean, focused wrapper. The link auto-styling covers the most common inline content case; consumers can override via `className` if the description context requires different link presentation.
