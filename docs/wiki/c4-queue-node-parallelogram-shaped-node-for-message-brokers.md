---
{
  "title": "C4 Queue Node — Parallelogram-Shaped Node for Message Brokers",
  "summary": "A SvelteFlow custom node that renders C4 message queue and broker elements using an amber CSS parallelogram shape. Uses `clip-path` for the skewed visual, includes URL-sanitized KB links, and fires click handlers for element selection.",
  "concepts": [
    "C4QueueNode",
    "parallelogram",
    "clip-path",
    "message queue",
    "SvelteFlow custom node",
    "amber",
    "safeKbUrl",
    "XSS prevention",
    "C4NodeData",
    "Handle",
    "brightness filter",
    "async messaging"
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
  "word_count": 381,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4QueueNode.svelte` renders asynchronous messaging infrastructure in C4 diagrams — message queues, event brokers, pub/sub buses, and similar components. It is registered as the `'queue'` node type and is routed to when a `C4Container` has `type: 'queue'`.

## Parallelogram Shape

The queue is visually rendered as a parallelogram using CSS `clip-path` on the inner `queue-shape` div:

```css
.queue-shape {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.35);
  clip-path: polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%);
}
```

The parallelogram is a standard UML notation for message queues and conveys asynchronous, directional data flow at a glance. The amber color scheme further distinguishes queues from the blue tones used for synchronous components.

Using `clip-path` means the outer `c4-queue-node` div retains its rectangular bounding box for SvelteFlow's hit-testing and handle placement, while the visible shape appears skewed. This prevents the visual shape from conflicting with SvelteFlow's internal geometry calculations.

## Content

Inside the queue shape:
- **Type label**: "Message Queue" in uppercase
- **Name**: primary identifier (`data.name`)
- **Technology badge**: `[RabbitMQ]`, `[Kafka]`, etc.
- **Description**: truncated at 50 characters
- **KB link**: sanitized documentation link if `data.kb_article` is set

## XSS Defense

The KB link uses `safeKbUrl()` (added 2026-04-10). Queue configurations sourced from external systems or AI-generated diagrams carry the same injection risk as any other node type — `javascript:` or `data:` scheme URLs in `kb_article` would execute in the browser on click without this guard.

## Click Handling

Like `C4DatabaseNode`, queue nodes do not implement drill-down — queues do not have navigable sub-levels in C4. The `handleClick` only fires `data.onclick(data.element)` for element selection. The KB link stops event propagation to prevent double-firing.

## Hover Effect

```css
.c4-queue-node:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}
```

`brightness` filter is used here instead of a shadow glow (as in `C4PersonNode`) because the amber `clip-path` shape makes standard box-shadow invisible — shadows render on the rectangular clipping container, not the visible parallelogram. `brightness` applies uniformly to the visible pixels regardless of shape.

## Known Gaps

- The `clip-path` skew percentages (8% / 92%) are hardcoded and produce a fixed skew angle. On very narrow or very wide nodes the parallelogram may look disproportionate.
- No drill-down support. Future event-sourcing diagrams may want to drill into queue topics or consumer groups.