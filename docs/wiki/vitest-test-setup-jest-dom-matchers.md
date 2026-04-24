---
{
  "title": "Vitest Test Setup — jest-dom Matchers",
  "summary": "A single-line Vitest global setup file that imports the @testing-library/jest-dom/vitest extension, injecting DOM-aware assertion matchers like toBeInTheDocument, toHaveClass, and toBeVisible into every test in the suite.",
  "concepts": [
    "Vitest",
    "test setup",
    "jest-dom",
    "testing-library",
    "custom matchers",
    "toBeInTheDocument",
    "toHaveClass",
    "setupFiles",
    "JSDOM",
    "component testing",
    "Svelte Testing Library"
  ],
  "categories": [
    "testing",
    "configuration",
    "vitest"
  ],
  "source_docs": [
    "91a3c8962a0edcb9"
  ],
  "backlinks": null,
  "word_count": 313,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`test-setup.ts` is the Vitest global setup file for the Ripple test suite. Its entire content is:

```typescript
import '@testing-library/jest-dom/vitest';
```

Despite its brevity, this file is foundational — without it, Vitest's default assertion library (`expect`) lacks the DOM-aware matchers that make component tests readable.

## What the Import Does

`@testing-library/jest-dom` extends the `expect` global with approximately 20 custom matchers for DOM state:

- `toBeInTheDocument()` — asserts element is present in the document
- `toHaveClass(className)` — checks CSS class presence
- `toBeVisible()` — checks visibility (display, opacity, visibility rules)
- `toHaveTextContent(text)` — checks rendered text
- `toBeDisabled()` / `toBeEnabled()` — checks form control state
- `toHaveAttribute(name, value)` — checks HTML attribute values

The `/vitest` subpath entrypoint specifically patches these into Vitest's `expect` rather than Jest's `expect` — they are not interchangeable. Using the base `@testing-library/jest-dom` import without `/vitest` would leave the matchers attached to a different `expect` instance and all assertions would fail silently with "matcher not found" errors.

## Why a Separate Setup File?

Vitest runs each test file in an isolated module scope. If the import were placed in individual test files, it would need to be repeated in every file. A global setup file (referenced in `vitest.config.ts` under `setupFiles`) runs once before each test file, ensuring the matchers are always available.

## Relationship to Svelte Testing Library

Ripple component tests use `@testing-library/svelte` to render components into a JSDOM environment. Svelte Testing Library provides `render`, `screen`, and `fireEvent` — the query and interaction layer. `jest-dom` provides the assertion layer on top. Both are required; neither replaces the other.

## Known Gaps

The setup file contains no other configuration. Projects that need global mock setup (e.g. mocking `window.matchMedia` for dark-mode tests, or stubbing `fetch`) would add those here. The current absence of such mocks means tests that exercise the dark-mode toggle in `+layout.svelte` would fail in JSDOM unless mocks are added.