---
{
  "title": "Accordion Content Panel",
  "summary": "AccordionContent wraps the bits-ui `Accordion.Content` primitive to provide the animated reveal/hide behavior for an accordion section's body. It adds a padded inner wrapper with opinionated link and paragraph styles, and exposes a `ref` binding for direct DOM access.",
  "concepts": [
    "accordion",
    "bits-ui",
    "Accordion.Content",
    "animation",
    "data-state",
    "Tailwind CSS",
    "WithoutChild",
    "cn utility",
    "snippet",
    "ref binding"
  ],
  "categories": [
    "widget",
    "layout"
  ],
  "source_docs": [
    "1800efad2753598d"
  ],
  "backlinks": null,
  "word_count": 481,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`accordion-content.svelte` is the body panel of a single accordion section. It is always used as a child of `AccordionItem` and paired with `AccordionTrigger`. The component delegates open/close state management entirely to the `bits-ui` `Accordion.Content` primitive.

## Animation

The component applies `data-open:animate-accordion-down` and `data-closed:animate-accordion-up` CSS classes. These are data-attribute-driven Tailwind animations: bits-ui sets `data-state="open"` or `data-state="closed"` on the content element, and the animations respond accordingly. The `overflow-hidden` class on the outer element clips the content during the height transition, preventing content from bleeding outside the accordion during animation.

This pattern — data-state animations rather than JS-driven height tweening — is more reliable across different content heights because it uses CSS `@keyframes` that animate the height from `0` to auto (or vice versa) without JavaScript measuring DOM heights.

## Inner Wrapper

The `bits-ui` content element itself carries the animation; an inner `<div>` provides the actual padding and typography defaults:

- `pt-0 pb-2.5` — Top-flush padding keeps the content visually tight below the trigger; bottom padding adds breathing room.
- `[&_p:not(:last-child)]:mb-4` — Adds margin-bottom to all non-terminal paragraphs inside the content. This prevents the caller from needing to manually space prose content.
- `[&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground` — Normalizes link styles. Accordion content often contains documentation or descriptive text with links; these rules ensure links look consistent without requiring callers to add their own link styles.

## Props

| Prop | Type | Notes |
|------|------|-------|
| `ref` | `HTMLElement` (bindable) | Direct DOM reference to the `Accordion.Content` element |
| `class` | `string` | Merged onto the inner `<div>` via `cn()` |
| `children` | snippet | Content body |
| `...restProps` | spread | Forwarded to `Accordion.Content` (e.g., `forceMount`) |

The `WithoutChild` utility type strips `children` from `AccordionPrimitive.ContentProps` before the spread. This prevents a type conflict: `children` is declared as a Svelte snippet prop in the component interface, and removing it from `restProps` avoids passing it twice to the primitive.

## Relationship to Other Accordion Pieces

`AccordionContent` is always a sibling of `AccordionTrigger` inside an `AccordionItem`. The bits-ui context that `Accordion.Content` reads is set by `Accordion.Root` — without the root ancestor, the content panel has no open/close state to respond to and will either stay permanently visible or throw a context error depending on the bits-ui version.

The `forceMount` prop (passed via `restProps`) is a common option in headless component libraries: when set, the content element stays in the DOM even when closed, rather than being unmounted. This is useful for SEO (search engines index the hidden content) and for animations that need the element to be present before transitioning in.

## Known Gaps

The `className` override applies to the inner `<div>`, not the outer `Accordion.Content` element. Callers who want to override the animation classes or overflow behavior on the outer element have no direct prop path — they would need to use a `:global()` CSS selector or wrap the component.