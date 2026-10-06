---
{
  "title": "C4 Database Node — Cylinder-Shaped SvelteFlow Node for Storage Elements",
  "summary": "C4DatabaseNode draws a container with type database as a cylinder tinted with the ripple info tone, with the Database eyebrow, name, technology, description and an optional sanitized KB link.",
  "concepts": [
    "database",
    "cylinder",
    "SvelteFlow node",
    "C4 Container",
    "ripple info tone",
    "safeKbUrl"
  ],
  "categories": [
    "widget",
    "diagram",
    "storage"
  ],
  "source_docs": [
    "5f8a5453f0b3726c"
  ],
  "backlinks": null,
  "word_count": 129,
  "compiled_at": "2026-10-06T08:10:24Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4DatabaseNode.svelte` is used for any element with `type: 'database'`, with or without `kind`. Its ELK box is 180 x 130.

## What it renders

A cylinder built from two elliptical caps around a body, filled and edged with `--ripple-info` mixed over the card ground, so it follows the host theme. Inside: a `Database` eyebrow, the name, the technology tag, the description cut at 50 characters, and a `Docs` link when `kb_article` is set (sanitized by `safeKbUrl`, new tab). A drill arrow shows when `drillable`.

## Interaction

A click calls `onclick(id)`; a database does not drill. Enter or Space on the focused node does the same. Status rings are drawn on the wrapper by `C4Diagram`; under `planned` the cylinder's content is dimmed with the dashed outline around it.
