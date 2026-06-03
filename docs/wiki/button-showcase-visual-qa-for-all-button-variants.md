---
{
  "title": "Button Showcase — Visual QA for All Button Variants",
  "summary": "A dedicated visual QA page for the Ripple Button widget, rendering every combination of variant, size, icon slot, loading state, disabled state, and full-width layout to enable manual and automated visual regression testing.",
  "concepts": [
    "Button widget",
    "visual QA",
    "variants",
    "sizes",
    "icon slots",
    "loading state",
    "disabled state",
    "aria-label",
    "Lucide icons",
    "Svelte snippets",
    "full-width",
    "accessibility"
  ],
  "categories": [
    "showcase",
    "widget",
    "input"
  ],
  "source_docs": [
    "78e02fd795dfc31f"
  ],
  "backlinks": null,
  "word_count": 410,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`routes/showcase/button/+page.svelte` is a purpose-built quality assurance harness for the `Button` widget. It imports `Button` and `Card` directly (not via the Ripple spec renderer) to test the component API at the Svelte layer, separate from the spec-to-component rendering path.

## Sections Covered

The page is divided into seven anchored sections, each testing an orthogonal dimension of the button:

### Variants
Six visual styles rendered at medium size:
- `default` — primary filled button
- `secondary` — softer fill
- `outline` — border-only
- `ghost` — no border, hover fill only
- `link` — text-only with underline
- `destructive` — red, for irreversible actions

### Sizes
Four size tiers: `sm`, `md`, `lg`, and the special `icon` size. The `icon` size renders a square button holding only a leading slot; it requires an `aria-label` because there is no visible text:

```svelte
<Button size="icon" aria-label="Add">
  {#snippet leading()}<Plus size={16} />{/snippet}
</Button>
```

The `aria-label` requirement is called out with an inline note, preventing accessibility regressions in copying the pattern.

### Icon Slots
Three icon positions: leading icon only, trailing icon only, and both simultaneously. Uses Lucide icons (`ArrowRight`, `Plus`) to test that the snippet slots compose cleanly with the button's internal flex layout.

### Loading State
A stateful demo with a 1500 ms timeout:

```typescript
let isLoading = $state<boolean>(false);
function handleLoadingClick() {
  isLoading = true;
  setTimeout(() => { isLoading = false; }, 1500);
}
```

This proves that passing `loading={isLoading}` disables the button and shows a spinner, then returns to normal after the timeout — exactly the interaction pattern a form submit would follow.

### Disabled
All six variants rendered in `disabled` state, verifying that the visual treatment is consistent (reduced opacity, `not-allowed` cursor) across all styles.

### Full-Width and Link
Tests `fullWidth` prop (button stretches to container width) and `href` prop (button renders as an `<a>` tag). Both are edge cases in the component's element selection logic.

### In-Card Composition
Renders buttons inside a `Card` to confirm that spacing, alignment, and visual hierarchy work when the Button is nested in a real layout context.

## Why Direct Imports Instead of Pocket Specs?

Pocket specs route through the Ripple spec interpreter. Testing at the Svelte component level catches prop-binding and snippet-slot bugs that would be masked if the only test path went through the spec interpreter.

## Known Gaps

No automated assertions — this is a visual-only QA page. Keyboard navigation and focus ring visibility are noted in comments but not formally verified.