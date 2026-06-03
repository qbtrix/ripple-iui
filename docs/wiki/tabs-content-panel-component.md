---
{
  "title": "Tabs Content Panel Component",
  "summary": "The content panel for an individual tab, delegating visibility control to the `bits-ui` Tabs primitive. Adds consistent typography sizing, flex growth, and outline removal while forwarding all primitive props.",
  "concepts": [
    "tabs content",
    "tabpanel",
    "bits-ui",
    "aria-hidden",
    "flex-1",
    "outline-none",
    "bindable ref",
    "ContentProps",
    "tab switching",
    "ARIA",
    "data-slot",
    "Svelte 5 runes"
  ],
  "categories": [
    "tabs",
    "navigation",
    "accessibility"
  ],
  "source_docs": [
    "9c7328fb59f05f60"
  ],
  "backlinks": null,
  "word_count": 400,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`TabsContent` renders the panel associated with a single tab value. It wraps `bits-ui`'s `Tabs.Content` primitive, which handles all the accessibility logic — ARIA role `tabpanel`, hidden/visible toggling based on the active tab value, and keyboard focus management. Ripple's wrapper adds visual polish on top without reimplementing any of that logic.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ref` | `HTMLElement \| null` | `null` | Bindable reference to the content panel DOM node |
| `class` | `string` | — | Additional classes merged with defaults |
| `...restProps` | `TabsPrimitive.ContentProps` | — | All `bits-ui` Content props (notably `value`) |

The `value` prop (which identifies which tab this panel belongs to) is passed through `...restProps`. This keeps the wrapper's API surface minimal — any new prop `bits-ui` adds to `ContentProps` is automatically supported without updating this file.

## Default Classes

- **`text-sm`** — Consistent small body text matching the overall tab system's typographic scale.
- **`flex-1`** — Allows the content panel to grow and fill available vertical space when the tabs container is a flex column. Without this, content panels in vertically-oriented tabs would not expand to fill the layout.
- **`outline-none`** — Removes the browser's default focus ring from the panel element itself. The panel receives programmatic focus when a user switches tabs via keyboard, and the default outline would create a visible box around the entire content area, which is rarely desirable. Individual interactive elements inside the panel retain their own focus styles.

## Why Delegate to bits-ui

The visibility toggle (showing only the active panel, hiding others) is handled entirely by `bits-ui`. This is correct — reimplementing ARIA `tabpanel` semantics is error-prone. The primitive ensures `aria-hidden`, `role="tabpanel"`, and `aria-labelledby` are set correctly. Ripple's wrapper only needs to manage presentation.

## The `bind:ref` Pattern

The `ref = $bindable(null)` prop and `bind:ref` on the primitive give parent components access to the panel's DOM node. This is useful for animating between panels, measuring content height for layout transitions, or attaching scroll handlers.

## Data Slot

`data-slot="tabs-content"` follows the ripple slot convention, enabling parent-level CSS targeting without class name coupling.

## Known Gaps

No TODO, FIXME, or HACK markers. The component does not include transition or animation support for panel switching — consumers who want animated tab transitions must implement that themselves using Svelte transitions or CSS animations on the content panel.