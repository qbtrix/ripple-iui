---
{
  "title": "C4 Person Node — Human Actor Node for C4 Context Diagrams",
  "summary": "A SvelteFlow custom node that renders a C4 Person element with a circular avatar icon and name/description labels. Distinguishes internal users (blue) from external actors (gray) and supports optional drill-down navigation.",
  "concepts": [
    "C4PersonNode",
    "human actor",
    "external user",
    "internal user",
    "SvelteFlow custom node",
    "person-head",
    "drill-down",
    "C4NodeData",
    "Handle",
    "blue vs gray",
    "context diagram"
  ],
  "categories": [
    "widget",
    "diagram",
    "actor"
  ],
  "source_docs": [
    "3d89f6ca92d8b34f"
  ],
  "backlinks": null,
  "word_count": 391,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4PersonNode.svelte` renders human actors in C4 Context-level diagrams — users, operators, customers, or external parties. It is registered as the `'person'` node type and appears at the outermost ring of any C4 diagram where human interactions are modeled.

## Internal vs External Styling

The node uses reactive color derivations to apply distinct palettes:

```typescript
const isExternal = $derived(data.external ?? false);
const bgColor = $derived(isExternal ? 'rgba(107,114,128,0.15)' : 'rgba(10,132,255,0.15)');
const borderColor = $derived(isExternal ? ...);
const headColor = $derived(isExternal ? '#6B7280' : '#0A84FF');
const textColor = $derived(isExternal ? ...);
```

Internal users get blue styling (matching system and container nodes). External actors get gray, visually indicating they are outside the system boundary. An "External" badge renders in the bottom of the card for external actors.

All colors are applied via inline `style` bindings rather than CSS classes because each color has an opacity-tuned value that cannot be expressed with static class names.

## Visual Anatomy

The node is laid out vertically:

1. **Person head** (`person-head`): A circular `<div>` with a person SVG icon (filled circle + path). Sized at 40×40px.
2. **Name** (`person-name`): 12px semibold, centered, word-break enabled for long names.
3. **Description** (`person-desc`): 9px, truncated at 45 characters.
4. **External badge**: shown only when `isExternal` is true.
5. **Drill indicator**: a small arrow shown when `hasDrilldown` is true.

## Connection Handles

All four handle positions (Top, Left, Bottom, Right) are registered. In Context-level diagrams, a person node typically appears at the left or top of the diagram with outgoing edges to systems, but ELK may choose any edge direction — all four attachment points prevent layout constraint violations.

## Hover Behavior

```css
.c4-person-node:hover {
  box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.4);
  transform: translateY(-1px);
}
```

Hover applies a blue ring glow and a 1px upward lift, consistent with the interactive affordance pattern used across all C4 node types.

## Drill-Down

If `hasDrilldown` is true, a click fires `data.ondrilldown`. Person nodes can in principle drill down (e.g., to show all systems a user interacts with), though this is less common than system→container→component drill-down.

## Known Gaps

- No KB link support — persons are pure actors with no documentation link in the current data model.
- The description truncation at 45 characters is hardcoded. Person descriptions are often short role labels, but long job titles could still overflow.