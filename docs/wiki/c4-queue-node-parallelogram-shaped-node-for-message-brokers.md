---
{
  "title": "C4 Queue Node — Parallelogram-Shaped Node for Message Brokers",
  "summary": "C4QueueNode draws a container with type queue as a parallelogram tinted with the ripple warning tone, with the Message Queue eyebrow, name, technology, description and an optional sanitized KB link.",
  "concepts": [
    "message queue",
    "parallelogram",
    "clip-path",
    "SvelteFlow node",
    "C4 Container",
    "ripple warning tone",
    "safeKbUrl"
  ],
  "categories": [
    "widget",
    "diagram",
    "messaging"
  ],
  "source_docs": [
    "514419a2adb19ab0"
  ],
  "backlinks": null,
  "word_count": 109,
  "compiled_at": "2026-10-06T08:10:24Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4QueueNode.svelte` is used for any element with `type: 'queue'`. Its ELK box is 200 x 110.

## What it renders

A parallelogram cut with `clip-path`, tinted with `--ripple-warning` over the card ground. Inside: a `Message Queue` eyebrow, the name, the technology tag, the description cut at 50 characters, and a `Docs` link when `kb_article` is set (sanitized by `safeKbUrl`, new tab). Relationships with `style: 'event'` into or out of a queue draw dashed in the same warning tone.

## Interaction

A click calls `onclick(id)`; a queue does not drill. Enter or Space on the focused node does the same. Status rings come from `C4Diagram` on the wrapper.
