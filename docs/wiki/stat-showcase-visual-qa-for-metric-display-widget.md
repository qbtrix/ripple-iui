---
{
  "title": "Stat Showcase — Visual QA for Metric Display Widget",
  "summary": "A comprehensive visual QA page for the Ripple Stat widget, covering all three sizes, five number formats, the full direction-semantics matrix, label/alignment options, and Card composition.",
  "concepts": [
    "Stat widget",
    "visual QA",
    "number formats",
    "direction semantics",
    "up-good",
    "down-good",
    "delta percent",
    "currency format",
    "compact format",
    "Intl.NumberFormat",
    "alignment",
    "Card composition"
  ],
  "categories": [
    "showcase",
    "widget",
    "data-visualization"
  ],
  "source_docs": [
    "d8b6c8c55954c665"
  ],
  "backlinks": null,
  "word_count": 375,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`routes/showcase/stat/+page.svelte` is a thorough quality assurance harness for the `Stat` display widget. It imports `Stat` and `Card` directly and renders every configuration axis independently, making it the reference page for verifying that the widget's number formatting, delta coloring, and layout props all work as documented.

## Sections

### Sizes
Three sizes rendered with identical data (currency `12450`, `+3.4%`, `up-good`):
- `sm` — compact, header-slot friendly
- `md` — default, standalone metric
- `lg` — hero numbers, top of dashboard

Rendering the same data at all three sizes exposes size-specific bugs like text truncation or delta badge overflow.

### Formats
Five number formats tested:

| Format | Example output | Use case |
|--------|---------------|----------|
| `number` | `1,234` | Counts, rankings |
| `currency` USD | `$1,234.50` | Revenue, costs |
| `currency` INR | `₹1,234.50` | Locale-specific currency |
| `percent` | `12.5%` | Conversion rates |
| `compact` | `1.23M` | Large impression counts |

The INR test uses `locale="en-IN"` to verify that the Stat widget passes locale overrides through to `Intl.NumberFormat`.

### Direction Matrix
The most important section: a grid combining `direction` (`up-good`, `down-good`) with positive and negative delta values. This produces four cells:

| | Positive delta | Negative delta |
|-|---------------|----------------|
| up-good | green ↑ | red ↓ |
| down-good | red ↑ | green ↓ |

The `down-good` direction is critical for metrics where lower is better (latency, error rate, churn). Without correct direction semantics, a latency increase would show green — a dangerous false signal in a monitoring dashboard.

### Labeled vs. Unlabeled
Tests the `label` prop both present and absent, verifying that the component handles the optional label gracefully without leaving empty whitespace.

### Alignment
Three alignment modes: `left` (default), `center`, and `right`. Right alignment is the common choice when `Stat` is embedded in a Card's header slot alongside a chart.

### Card Composition
Renders Stat widgets inside Cards at different sizes to verify spacing compatibility. This mirrors the most frequent real-world usage pattern.

## Known Gaps

The showcase does not test zero-delta (`deltaPercent: 0`) or undefined-delta states, which would reveal whether the widget hides the delta badge or renders a neutral indicator. Very large values (e.g. `1234567890`) are not tested for overflow behavior.