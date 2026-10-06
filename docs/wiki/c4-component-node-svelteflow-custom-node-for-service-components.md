---
{
  "title": "C4 Component Node — SvelteFlow Custom Node for Service Components",
  "summary": "C4ComponentNode draws C4 Components and Code elements: the shared card with a type eyebrow (the subtype, Component, or Code with a monospace file name), technology, description, an optional sanitized KB link and a drill affordance.",
  "concepts": [
    "C4 Component",
    "Code element",
    "SvelteFlow node",
    "kb_article",
    "safeKbUrl",
    "drill-down",
    "monospace"
  ],
  "categories": [
    "widget",
    "diagram",
    "security"
  ],
  "source_docs": [
    "f652039c9fef2759"
  ],
  "backlinks": null,
  "word_count": 178,
  "compiled_at": "2026-10-06T08:10:24Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4ComponentNode.svelte` is the SvelteFlow node for components and, with `kind: 'code'`, for code elements such as a file or a class.

## What it renders

- An eyebrow: `Code` for a code element, the capitalised `type` subtype (`Service`, `Controller`, ...) when set, else `Component`.
- The name. A code element's name is set in a monospace face sized to fit the box, since a file name is one long token.
- The technology tag and the description cut at 50 characters.
- A `Docs` link for `kb_article`, sanitized by `safeKbUrl` and opening in a new tab.
- A drill arrow when `drillable`.

The card is the shared `c4-node` rule set in `C4Diagram` with an 8px radius.

## Interaction

A drillable component calls `ondrilldown(id, 'code')`, otherwise `onclick(id)`; Enter or Space on the focused node does the same. In semantic zoom, an expanded code element with a `code` excerpt is drawn by `C4CodeNode` as an in-map code panel instead of this card. A `planned` status draws the card as a blueprint: dashed muted outline, no fill, content dimmed.
