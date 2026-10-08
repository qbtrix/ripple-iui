---
{
  "title": "C4 Diagram Widget — SvelteFlow + ELK Architecture Visualizer",
  "summary": "C4Diagram is the C4 model widget: SvelteFlow renders it, ELK.js lays it out. It draws all four C4 levels with drill-down, pan/zoom and a minimap, and adds an optional live layer (status rings, crew markers, a following camera) and an optional semantic zoom that opens elements in place down to code.",
  "concepts": [
    "C4 model",
    "C4Diagram",
    "SvelteFlow",
    "ELK layout",
    "drill-down",
    "live status",
    "planned status",
    "markers",
    "follow camera",
    "semantic zoom",
    "code panel",
    "ripple tokens",
    "legend"
  ],
  "categories": [
    "widget",
    "diagram",
    "layout"
  ],
  "source_docs": [
    "dca4824057c9d36d"
  ],
  "backlinks": null,
  "word_count": 881,
  "compiled_at": "2026-10-06T08:10:24Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4Diagram.svelte` is the entry point of the C4 widget. It takes a `diagram` (level, elements, relationships), lays it out with ELK's layered algorithm, and renders it in SvelteFlow with pan, zoom, a minimap and zoom controls. Every option beyond `diagram` is optional; without them the widget is a plain C4 diagram with drill-down. It is registered as the `c4` spec widget and exported from `@ripple-ui/svelte/widgets` for hosts that mount it directly.

## Props

| Prop | Type | Purpose |
|------|------|---------|
| `diagram` | `C4DiagramData` | Level, title, elements, relationships |
| `class` | `string` | Extra class on the root |
| `onclick` | `(id) => void` | A node was clicked (or activated by keyboard) |
| `ondrilldown` | `(id, level) => void` | A drillable node was clicked; the host swaps in the next diagram |
| `status` | `Record<id, C4Status>` | Live state per element, drawn as a ring |
| `markers` | `Record<id, C4Marker[]>` | Dots on a node: who is working there |
| `focusId` / `follow` | `string` / `boolean` | Keep the camera on one element |
| `selectedId` | `string` | Controlled selection; unset, clicks select |
| `onmanualcamera` | `() => void` | The user panned or zoomed (zoom buttons and minimap included) |
| `expanded` | `string[]` | Turns on semantic zoom: these ids are drawn open |
| `scopeId` | `string` | Semantic zoom: the element being looked inside |

## Layout and edges

ELK lays out every element, with an element's non-empty `containers` nested inside a dashed boundary (with `kind` set, `containers` can hold any lower level: a container's components, a component's code). `children` is read only by semantic zoom. Every card is fixed to its ELK box, and edges follow ELK's orthogonal routes with rounded corners (`C4Edge`), labels in the space ELK reserved. If ELK returns no route the edge falls back to a smoothstep. `async` relationships are dashed and animated, `event` relationships dashed in the warning tone (`edgeLook` in `live.ts`, used by both the plain and the semantic graph). Layer spacing is 56px.

## Canvas, header and legend

The canvas is styled only with `--ripple-*` tokens, every xyflow colour variable included, so it follows the host's light or dark theme; cards sit on an opaque ground derived from the ink so translucent hosts do not show edges through them. The canvas fills a parent that gives it a height and falls back to 480px. An empty `title` hides the header, for hosts that draw their own chrome. The legend lists the statuses present when `status` is passed, otherwise the C4 shapes. Connection handles are hidden: nothing is connectable.

SvelteFlow stays mounted across diagram swaps. Only the first layout shows the loading state; a stale layout (the diagram changed before ELK finished) is discarded; a failed layout shows an error message.

## Live layer

`status` sets `data-c4-status` on the node wrapper and one CSS ring covers every node shape:

| Status | Treatment |
|--------|-----------|
| `failed` | Error ring with a halo |
| `changing` | Accent ring that breathes (static under reduced motion) |
| `drift` | Dashed warning ring |
| `changed` | Soft accent ring |
| `landed` | Success ring |
| `planned` | Dashed muted outline, no card fill, content dimmed: a blueprint for something not in code yet |

`planned` is distinct from the scope ghost (the whole node faded, outline unchanged) and the two compose. Markers are drawn in screen space (`C4LiveLayer`), so dots keep their size at every zoom. With `follow`, the camera eases to `focusId`; a user gesture calls `onmanualcamera` so the host can drop follow mode. Enter or Space on a focused node runs exactly what a click on it runs (`activateNode` in `activate.ts`): cards drill when drillable, boundaries, databases, queues and code panels only click.

## Legibility at any zoom

`C4LiveLayer` writes the zoom into `--c4-zoom`; names and edge labels counter-scale below 1x. Below 0.9x (`data-c4-far`) cards keep only name and technology. Fits never zoom past 1x.

## Semantic zoom

Passing `expanded` (even `[]`) switches to one canvas for the whole tree. An expanded element opens in place as a boundary around its children; an expanded code element with a `code` excerpt opens as a code panel (`C4CodeNode`) with the file's own line numbers, the change tinted and a Before/After switch. `scopeId` ghosts what lies outside it. Relationships lift onto the drawn siblings with counts, and an edge keeps its dash when every relationship behind it shares a style; where an edge meets an expanded boundary it carries a port badge, and crossings drawn further out become chips on the scope boundary. Markers on hidden elements roll up to their drawn ancestor. Between layouts nodes glide and resize on the ripple ease, leaving nodes fade, and the camera eases to ELK's final box; all instant under reduced motion. The pure logic lives in `semantic.ts` and `semantic-flow.ts`.

## Known gaps

- No arrow-key traversal between nodes; only Enter/Space activation.
- SvelteFlow logs a "$state.raw for nodes" warning because node data carries the click callbacks.
- The opaque card ground uses `oklch(from ...)` relative colour (Safari 16.4+).
- A code panel's height is an estimate from line count and wrap; overflow scrolls inside the panel.
