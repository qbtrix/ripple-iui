---
{
  "title": "C4 Group Node — System Boundary Container for SvelteFlow Parent Nodes",
  "summary": "C4GroupNode draws a C4 boundary: the dashed box that nests the next level down. Its label row names the boundary's kind and is the clickable part; in semantic zoom the scope boundary also lists its far connections as chips.",
  "concepts": [
    "boundary",
    "group node",
    "SvelteFlow parent node",
    "nesting",
    "scope chips",
    "C4PortBadge",
    "semantic zoom",
    "ripple tokens"
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
  "word_count": 249,
  "compiled_at": "2026-10-06T08:10:24Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4GroupNode.svelte` is the SvelteFlow parent node for a C4 boundary. In a plain diagram any element with a non-empty `containers` is a boundary (`isGroupNode`); with `kind`, those can be a container's components or a component's code. In semantic zoom every expanded element becomes one. ELK sizes it around its children, which SvelteFlow places relative to it through `parentId`.

## What it renders

- A dashed box with a 12px radius and a faint ink tint, all on ripple tokens; an external boundary uses the plain border colour.
- A label row inside the top of the box: the kind (`Software System`, `External System`, `Container`, `Component`, `Code`, from `kindLabel`), the name, and the technology.
- In semantic zoom, the scope boundary's crossings drawn further out appear as `C4PortBadge` chips right after the label, so they stay in sight when the boundary is wider than the view. Each chip's tooltip lists the relationships behind it.

The box itself passes pointer events through, so the canvas still pans from inside a boundary; only the label row is clickable and calls `onclick`. On the semantic canvas the frame fades in when a card opens into it (instantly under reduced motion). When zoomed far out, the kind and technology drop away and the name counter-scales.

## Status

A status ring is drawn on the wrapper by `C4Diagram`, like any node. A `planned` boundary keeps its dashed outline and dims its label row; its children are separate SvelteFlow nodes with their own status.
