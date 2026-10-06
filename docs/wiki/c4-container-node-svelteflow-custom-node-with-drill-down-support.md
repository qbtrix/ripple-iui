---
{
  "title": "C4 Container Node — SvelteFlow Custom Node with Drill-Down Support",
  "summary": "C4ContainerNode draws a C4 Container as the shared ringed card with a Container eyebrow, technology, description, an optional sanitized KB link and a drill affordance to its components.",
  "concepts": [
    "C4 Container",
    "SvelteFlow node",
    "drill-down",
    "kb_article",
    "safeKbUrl",
    "ripple tokens"
  ],
  "categories": [
    "widget",
    "diagram",
    "navigation"
  ],
  "source_docs": [
    "127094cc96ac5469"
  ],
  "backlinks": null,
  "word_count": 155,
  "compiled_at": "2026-10-06T08:10:24Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4ContainerNode.svelte` is the SvelteFlow node for a deployable container (an app, an API). Containers with `type: 'database'` or `'queue'` use their own shapes instead (`C4DatabaseNode`, `C4QueueNode`).

## What it renders

- A `Container` eyebrow, the name, the technology tag and the description cut at 55 characters.
- A `Docs` link when `kb_article` is set. The URL goes through `safeKbUrl`, which drops `javascript:` and `data:` schemes; the link opens in a new tab and stops its click from reaching the node.
- A drill arrow when `drillable` (set explicitly, or inferred from a non-empty `components`).

Styling is the shared `c4-node` card in `C4Diagram`, dashed when external.

## Interaction

A click on a drillable container calls `ondrilldown` with `component` on a container-level diagram and `code` otherwise, else `onclick`. Enter or Space on the focused node does the same. In semantic zoom an expanded container draws as a boundary around its components instead of this card.
