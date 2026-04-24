---
{
  "title": "C4 Group Node — System Boundary Container for SvelteFlow Parent Nodes",
  "summary": "A SvelteFlow parent/group node that renders a C4 system boundary as a dashed border container. It acts as the visual wrapper for nested container nodes, providing the \"system boundary box\" pattern from C4 architecture diagrams.",
  "concepts": [
    "C4GroupNode",
    "group node",
    "parent node",
    "system boundary",
    "SvelteFlow",
    "pointer-events",
    "dashed border",
    "external system",
    "ELK parent node",
    "C4NodeData",
    "container nesting"
  ],
  "categories": [
    "widget",
    "diagram",
    "layout"
  ],
  "source_docs": [
    "b7bae91d591d4f96"
  ],
  "backlinks": null,
  "word_count": 414,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4GroupNode.svelte` renders the system boundary box that wraps container nodes in C4 Context and Container level diagrams. It is registered as the `'group'` node type and is used whenever `isGroupNode(el)` returns true — i.e., for systems that have child containers.

## SvelteFlow Parent Node Semantics

In SvelteFlow, a group/parent node is one whose `id` is referenced as `parentId` by child nodes. The parent node renders behind its children and its dimensions are set by the layout engine (ELK in this case) to encompass all children with padding. `C4GroupNode` is designed entirely around this constraint:

```css
.c4-group-node {
  width: 100%;
  height: 100%;
  pointer-events: none;
}
```

The `width: 100%` and `height: 100%` fill the dimensions SvelteFlow provides. `pointer-events: none` on the root element prevents the invisible bounding box from capturing mouse events that should fall through to child nodes. The label strip re-enables pointer events (`pointer-events: auto`) so the system name itself is still clickable.

## Visual Design

The group renders a dashed border with a very faint background fill:
- **Internal systems**: blue dashed border (`rgba(37,99,235,0.3)`), subtle blue background
- **External systems**: gray dashed border (`rgba(107,114,128,0.35)`), neutral background

The dashed style follows the C4 standard notation for system boundaries. The color coding (blue = internal, gray = external) matches the convention used across all other C4 node types.

## Label Placement

The system name, type label, and technology tag are placed in a strip at the **top-left corner**, overlapping the border edge:

```css
.group-label {
  position: absolute;
  top: -1px;
  left: 12px;
  background: rgba(10, 15, 30, 0.85);
  border-radius: 0 0 6px 6px;
}
```

The `top: -1px` alignment sits the label on the border line. The dark semi-transparent background ensures the label text is readable regardless of what's behind it. This pattern mirrors how group labels are rendered in tools like Miro and Lucidchart.

## External vs Internal

```svelte
const isExternal = $derived(data.external ?? false);
```

The external flag changes border color inline via a `style` attribute rather than a CSS class, because both the border color and style need to change together based on a single boolean — a reactive style binding is cleaner than managing two conditional class names.

## Known Gaps

- No KB link support, unlike container and component nodes. System boundary groups do not currently link to documentation.
- The `onclick` handler calls `data.onclick(data.element)` but `pointer-events: none` on the root means the click only fires when hitting the label strip. This may be intentional but is not documented.