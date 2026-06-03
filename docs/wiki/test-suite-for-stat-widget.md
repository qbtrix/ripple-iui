---
{
  "title": "Test Suite for Stat Widget",
  "summary": "Comprehensive Vitest + Testing Library test suite for the Stat display widget covering number formatting, all direction/sentiment combinations, delta chip rendering, size variants, and Lucide icon selection. Uses data attributes as stable test hooks rather than class names.",
  "concepts": [
    "testing",
    "vitest",
    "testing-library",
    "Stat widget",
    "direction sentiment",
    "data attributes",
    "number formatting",
    "locale testing",
    "delta chip",
    "Lucide icons"
  ],
  "categories": [
    "testing",
    "widget",
    "display",
    "test"
  ],
  "source_docs": [
    "90f4dbac966dde1c"
  ],
  "backlinks": null,
  "word_count": 473,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This test suite validates `Stat.svelte` — Ripple's metric display widget — across its full behavioral surface. The tests are organized around three concerns: value formatting, the direction/sentiment system, and DOM attribute contracts.

## Test Setup

The suite uses `@testing-library/svelte` for rendering and `vitest` as the test runner. There are no mocks — all tests render the real Stat component and assert against the DOM. This ensures the tests catch regressions in the rendering path, not just the logic.

```typescript
import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Stat from '$lib/widgets/display/Stat.svelte';
```

## Formatting Tests

Four tests cover the `format` prop:

- **Number:** `1234` → `"1,234"` (verifies comma separator)
- **Currency:** `1234.5` with `format='currency'` and `locale='en-US'` → `"$1,234.50"` (verifies 2 decimal places)
- **Percent:** `0.125` with `format='percent'` → `"12.5%"` (verifies `Intl` percent mode multiplies by 100)
- **String passthrough:** `"$12,450"` renders unchanged (guards against double-formatting pre-localized strings)

The locale is pinned to `'en-US'` in tests to avoid locale-dependent failures on CI runners with different system locales.

## Direction and Sentiment Tests

This is the densest section. It covers all five `direction` modes:

| Test | Input | Expected `data-direction` | Expected `data-sentiment` |
|------|-------|--------------------------|---------------------------|
| explicit up | `direction='up'` | `up` | `positive` |
| explicit down | `direction='down'` | `down` | `negative` |
| auto + positive delta | `delta=5` | `up` | `positive` |
| auto + negative delta | `delta=-5` | `down` | `negative` |
| auto + zero delta | `delta=0` | `neutral` | `neutral` |
| default direction | no direction prop | `up` (inferred from delta=5) | — |
| down-good + positive delta | `direction='down-good', delta=5` | `up` (visually) | `negative` |
| up-good + negative delta | `direction='up-good', delta=-5` | `down` | `negative` |
| up-good + positive delta | `direction='up-good', delta=5` | `up` | `positive` |

The `down-good` test is particularly important: it confirms that a rising value on a "lower is better" metric (e.g., error rate) correctly renders with a negative sentiment despite having a positive delta.

## Data Attribute Contract Tests

These tests assert the machine-readable surface of the component:

- `data-size` reflects the `size` prop (defaults to `'md'`)
- `data-direction` and `data-sentiment` on the root element
- `data-slot="stat-delta"` is present only when `delta` or `deltaPercent` is provided

Using data attributes instead of class names as test hooks means the tests remain stable when Tailwind class names change.

## Icon Tests

Three tests verify that the correct Lucide icon class appears in the DOM:

- `direction=up` → `.lucide-arrow-up`
- `direction=down` → `.lucide-arrow-down`
- `direction=neutral` → `.lucide-minus`

## Known Gaps

- No test for `deltaFormat='both'` (showing both absolute and percent in the chip).
- No test for the `align` prop or custom `class` passthrough.
- No test verifies that `format='compact'` produces compact notation (e.g., `1.2K`).