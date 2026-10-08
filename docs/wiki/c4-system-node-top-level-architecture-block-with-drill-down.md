---
{
  "title": "C4 System Node — Top-Level Architecture Block with Drill-Down",
  "summary": "C4SystemNode draws a C4 Software System as the shared ringed card: a Software System or External System eyebrow, name, description, technology, dashed and muted when external, with a drill affordance when drillable.",
  "concepts": [
    "C4 System",
    "SvelteFlow node",
    "software system",
    "external system",
    "drill-down",
    "ripple tokens"
  ],
  "categories": [
    "widget",
    "diagram",
    "navigation"
  ],
  "source_docs": [
    "07cf4f2ef4bc430d"
  ],
  "backlinks": null,
  "word_count": 162,
  "compiled_at": "2026-10-06T08:10:24Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4SystemNode.svelte` is the SvelteFlow node for a software system without nested containers (a system with containers draws as a boundary, `C4GroupNode`). It is also the fallback shape for any element the type inference cannot place. Its ELK box is 200 x 110.

## What it renders

- An eyebrow: `Software System`, or `External System` when `external`.
- The name, the description cut at 60 characters, and the technology as a small tag.
- A drill arrow when `drillable`.

External systems use a dashed border and a muted name. All styling is the shared `c4-node` card from `C4Diagram`, on ripple tokens, so the node follows the host's light or dark theme.

## Interaction

Clicking a drillable system calls `ondrilldown(id, nextLevel)` (context to container, container to component, otherwise code); otherwise `onclick(id)`. Enter or Space on the focused node does the same. `drillable` can be set on the element to show the affordance even when its children are not part of this diagram.
