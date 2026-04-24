---
{
  "title": "Home Page — Pocket Gallery with Detail View",
  "summary": "The Ripple app's main landing page, which renders a gallery of interactive pocket demos (Research, Market Watch, Weather, and others) in an accordion layout and expands any selected pocket into a full detail view powered by the Ripple component.",
  "concepts": [
    "pocket spec",
    "Ripple component",
    "gallery",
    "detail view",
    "market watch",
    "research pocket",
    "weather pocket",
    "RippleEvent",
    "accordion",
    "sparkline",
    "candlestick"
  ],
  "categories": [
    "routing",
    "demo",
    "pocket-spec"
  ],
  "source_docs": [
    "dc1ebea65edc672c"
  ],
  "backlinks": null,
  "word_count": 428,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`routes/+page.svelte` is simultaneously a demonstration and a proof-of-concept for Ripple pockets. It holds several hard-coded pocket specs — research article, market watch, weather — and renders them in an interactive accordion gallery. Selecting a pocket replaces the gallery with a detail view showing the full Ripple-rendered UI.

## Pocket Specs

Each pocket is a plain JavaScript object conforming to the Ripple spec format:

```typescript
const researchPocket = {
  version: '1.0' as const,
  ui: {
    type: 'flex',
    props: { direction: 'column', gap: '20px' },
    children: [ /* widget tree */ ]
  }
};
```

The specs are authored inline rather than fetched from an API, which serves two purposes: the page loads instantly with no network dependency, and the specs serve as living reference examples of how to compose widgets.

### Research Pocket

Demonstrates the research widget family: `source-card`, `citation`, `sources-bar`, `discover-card`, `follow-up`, `heading`, `text`, and `image` widgets nested inside a vertical flex container. The sources bar and citations show how Ripple handles multi-source attribution UI.

### Market Watch Pocket

Comprises a 3-column grid of sparkline charts with badge tickers (NIFTY, SENSEX, BANK NIFTY), a candlestick chart for a 5-day Reliance view, and a compact table of top movers. This pocket stresses the chart widget's multiple types (`sparkline`, `candlestick`) and the grid layout widget.

### Weather Pocket

A location header, current temperature, and extended forecast — demonstrating text sizing (`2xl`, `xs`) and flex layout composition for card-style pockets.

## Event Handling

```typescript
function handleEvent(event: RippleEvent) {
  console.log('RippleEvent:', event);
}
```

All interactive widgets (buttons, follow-up inputs, etc.) bubble events up through the Ripple component. On this demo page the handler logs to the console, which is intentional — the page is a development preview, not a production feature with real back-end calls.

## Gallery / Detail Navigation

The accordion gallery renders each pocket as a collapsible row. Clicking a pocket header toggles it open to show a preview. A "expand to detail" action replaces the gallery entirely with a single full-size Ripple render of that pocket, with a back button returning to the gallery.

This two-mode layout is implemented with a single reactive state variable tracking the selected pocket ID. The conditional render avoids mounting multiple Ripple instances simultaneously, which keeps memory usage low during demo browsing.

## Known Gaps

Pocket specs are hard-coded; the page has no mechanism to load specs from an external source or from the Ripple streaming API. The event handler is a console stub — there is no demonstration of how a host would respond to `follow-up` submit events with real data.