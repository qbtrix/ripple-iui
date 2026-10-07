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

`status` sets `data-c4-status` on the node wrapper (written straight to the DOM, so a status change never re-renders the graph) and one CSS ring covers every node shape:

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

`C4LiveLayer` writes the zoom into `--c4-zoom`; names and edge labels counter-scale below 1x. Below 0.9x (`data-c4-far`) cards keep only name and technology. Fits never zoom past 1x. The variable is inherited by every node, so it is written only when the value the cards read changes (clamped to 0.5–1, two decimals), and not while a camera move the layer started is flying; the final zoom lands with the move.

## Semantic zoom

Passing `expanded` (even `[]`) switches to one canvas for the whole tree. An expanded element opens in place as a boundary around its children; an expanded code element with a `code` excerpt opens as a code panel (`C4CodeNode`) with the file's own line numbers, the change tinted and a Before/After switch. `scopeId` ghosts what lies outside it. Relationships lift onto the drawn siblings with counts, and an edge keeps its dash when every relationship behind it shares a style; where an edge meets an expanded boundary it carries a port badge, and crossings drawn further out become chips on the scope boundary. Markers on hidden elements roll up to their drawn ancestor. Between layouts nodes glide and resize on the ripple ease, leaving nodes fade, and the camera eases to ELK's final box; all instant under reduced motion. The pure logic lives in `semantic.ts` and `semantic-flow.ts`.

## Redrawing a live map

A live host (a run streaming files in) re-lays the map often, so the widget keeps each change to one layout and one render:

- ELK runs in a module worker (`elk-worker.js`, one per page). Where no worker can start (SSR, jsdom) or it dies, layouts run on the main thread; an ELK error from the worker rejects as before. A host bundling with Vite gets the worker from `new Worker(new URL('./elk-worker.js', import.meta.url))`; `elk-layout.ts` also imports the worker module so a dev server serving a linked (`file:`) copy of the package lets the worker URL load.
- In semantic zoom the camera holds while a layout computes and moves once when it lands. "Computing" is derived from the props (the diagram, `expanded` and `scopeId` differ from the last layout that landed), so a focus that changes together with the diagram never aims at the old layout first.
- Every semantic node has one SvelteFlow type, `c4` (`C4ViewNode`, which draws `data.view` with that view's component), and the class that view's own type would give the wrapper (`svelte-flow__node-group` and so on). An element opening from a card into a boundary or code panel changes its view, not its type: SvelteFlow answers a type change by re-measuring that node and rewriting the whole nodes array, once per changed node.
- SvelteFlow's `nodes` prop is bound (to a writable derived of the decorated nodes). SvelteFlow writes nodes back after a re-measure, a `fitView` or a click selection; into an unbound bindable prop Svelte keeps that write as a deep `$state` proxy, so every node read back as a new object and SvelteFlow rebuilt every node and edge.
- Every node is handed to SvelteFlow with its size and handles (`presized`), which the ELK box already fixes. Without them SvelteFlow forgets a node's handles on every new nodes array and remounts every edge, label and port badge.
- A node whose box changes size takes the new size at once; its card and status ring grow from the old size (`markResized`). Animating the wrapper itself made SvelteFlow re-measure it and re-lay every edge on each frame.
- Nodes leaving the map fade where they were and stay, hidden from assistive tech and the minimap, until the next layout replaces them, so a move costs one render, not two.

On the Belt's 200-component harness this holds the map at 58-59 fps with a 16.8 ms p95 frame while files stream in (dev build). What remains per layout is the layout itself: ELK re-layers the map when an element opens, so nearly every node and edge moves, and applying, restyling and painting that costs about 70 ms on the main thread in a dev build.

## Known gaps

- No arrow-key traversal between nodes; only Enter/Space activation.
- SvelteFlow logs a "$state.raw for nodes" warning because node data carries the click callbacks.
- The opaque card ground uses `oklch(from ...)` relative colour (Safari 16.4+).
- A code panel's height is an estimate from line count and wrap; overflow scrolls inside the panel.
