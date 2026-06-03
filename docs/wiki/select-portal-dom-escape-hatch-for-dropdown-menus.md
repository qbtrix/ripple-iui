---
{
  "title": "Select Portal — DOM Escape Hatch for Dropdown Menus",
  "summary": "A thin wrapper around bits-ui's `Select.Portal` that teleports the select dropdown out of its DOM parent and into the document body. This prevents clipping caused by `overflow: hidden` or `z-index` stacking contexts on ancestor elements.",
  "concepts": [
    "portal",
    "DOM teleport",
    "overflow clipping",
    "z-index stacking",
    "bits-ui",
    "SelectPrimitive.Portal",
    "restProps",
    "PortalProps",
    "dropdown positioning",
    "Svelte 5 runes"
  ],
  "categories": [
    "widget",
    "select",
    "layout",
    "overlay"
  ],
  "source_docs": [
    "3ad1139eaca3b9c9"
  ],
  "backlinks": null,
  "word_count": 521,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The Select Portal component solves one of the most persistent layout bugs in dropdown UIs: a select menu that gets visually clipped or hidden beneath sibling elements because its nearest scrollable ancestor has `overflow: hidden` applied. By teleporting the menu's DOM node to the document `<body>`, the portal ensures the dropdown floats above all content regardless of where the trigger lives in the component tree.

## Why a Portal Is Necessary

In a standard CSS stacking context, a positioned element (`position: absolute` or `position: fixed`) is constrained by the nearest ancestor that establishes a stacking context — typically any element with `overflow`, `transform`, `filter`, or an explicit `z-index`. Without a portal, a select dropdown rendered inside a card, table cell, or sidebar panel would be clipped at that ancestor's boundary.

The portal pattern breaks this constraint by physically re-parenting the dropdown node to `<body>` at mount time. The dropdown then positions itself relative to the viewport, not the component tree, making `z-index` and overflow handling predictable everywhere.

## Implementation

```svelte
<script lang="ts">
  import { Select as SelectPrimitive } from "bits-ui";

  let { ...restProps }: SelectPrimitive.PortalProps = $props();
</script>

<SelectPrimitive.Portal {...restProps} />
```

The component is intentionally minimal. It imports `PortalProps` from `bits-ui` for type safety and forwards all props via `...restProps`. There is no local state, no event handling, and no styling — it is a pure delegation layer.

## Props

All props come directly from `SelectPrimitive.PortalProps`. Common props exposed by bits-ui's portal implementation include:

- **`to`** — A CSS selector or DOM node designating the mount target (defaults to `document.body`).
- **`disabled`** — When `true`, portal behavior is disabled and the content renders in-tree. Useful for SSR environments or testing contexts where `document` may not be available.

## Role in the Select System

The portal sits between the root `Select` component and the content/listbox. The typical composition is:

```svelte
<Select>
  <SelectTrigger />
  <SelectPortal>
    <SelectContent>
      <SelectItem />
    </SelectContent>
  </SelectPortal>
</Select>
```

The portal is optional — if your select lives in an unconstrained context you can skip it. But including it by default is defensive programming: it means the select continues to work correctly when the component is later moved inside a modal, a sidebar, or a data table.

## Accessibility Considerations

bits-ui's portal implementation maintains ARIA relationships across the DOM boundary. The `aria-controls`, `aria-expanded`, and `aria-owns` attributes are managed by the primitive, so teleporting the content node does not break screen reader association between the trigger button and the listbox.

## Known Gaps

- No explicit `disabled` prop is surfaced in the Ripple wrapper itself; callers must pass it through `restProps` and know the bits-ui API. A named prop could improve discoverability.
- Server-side rendering requires care: portals are inherently client-only. The bits-ui primitive handles this, but no explicit SSR guard is visible in this wrapper.

## Summary

Select Portal is a zero-logic passthrough that solves a real-world rendering problem. Its value is not in code complexity but in establishing a clear architectural boundary: the trigger stays in the component tree; the floating content escapes to the body. This separation makes the select composable in any layout context.