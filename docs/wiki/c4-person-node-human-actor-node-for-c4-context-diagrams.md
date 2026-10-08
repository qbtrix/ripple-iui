---
{
  "title": "C4 Person Node — Human Actor Node for C4 Context Diagrams",
  "summary": "C4PersonNode draws a C4 Person: the shared card under an accent-tinted avatar disc, muted with an External tag when the person is external, with a drill affordance when drillable.",
  "concepts": [
    "C4 Person",
    "SvelteFlow node",
    "avatar",
    "external actor",
    "drill-down",
    "ripple tokens"
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
  "word_count": 166,
  "compiled_at": "2026-10-06T08:10:24Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4PersonNode.svelte` is the SvelteFlow node for a human actor. An element becomes a person when `kind: 'person'` is set, or, without `kind`, when it has none of `technology`, `type`, `containers` or `components`. Its ELK box is 160 x 140.

## What it renders

- An avatar disc (34px) with a person glyph, tinted with `--ripple-accent`; muted when the person is external.
- The name, and the description cut at 45 characters.
- An `External` tag for an external person.
- A drill arrow in the corner when `drillable`.

The card uses the shared `c4-node` rules from `C4Diagram` (12px radius for persons), so it follows the host theme and stays legible when zoomed out.

## Interaction

A click on a drillable person calls `ondrilldown` with the next level (context to container, container to component, otherwise code); otherwise it calls `onclick`. Enter or Space on the focused node does the same. Live status rings, including the dashed `planned` outline, are drawn on the wrapper by `C4Diagram`.
