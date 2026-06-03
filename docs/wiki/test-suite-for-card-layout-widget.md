---
{
  "title": "Test Suite for Card Layout Widget",
  "summary": "Vitest + Testing Library test suite covering the Card widget's rendering, structural conditionals, variant/density data attributes, interactive button behavior, and ARIA semantics. The suite validates both the happy path and defensive edge cases like non-interactive cards with onclick handlers.",
  "concepts": [
    "testing-library",
    "vitest",
    "Card widget",
    "data-slot",
    "aria-pressed",
    "role=button",
    "keyboard events",
    "userEvent",
    "interactive card",
    "data attributes",
    "accessibility testing"
  ],
  "categories": [
    "testing",
    "layout",
    "accessibility",
    "test"
  ],
  "source_docs": [
    "eae143dc6986ce9f"
  ],
  "backlinks": null,
  "word_count": 424,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This test file exercises `lib/widgets/layout/Card.svelte` using `@testing-library/svelte` and `@testing-library/user-event`. It covers the full behavioral contract of the Card widget — from DOM structure conditionals to keyboard-activated click handlers.

## Test Structure

The suite uses flat `test()` calls (no `describe` grouping). Each test is focused on a single behavior, making failures immediately actionable.

## What Is Tested

### Conditional Header Rendering

```typescript
test('omits header block when no title or description', () => {
  const { container } = render(Card, { props: {} });
  expect(container.querySelector('[data-slot="card-header"]')).toBeNull();
});
```

This test guards against an empty header div leaking into the DOM when no content props are passed. The `data-slot` selector is used rather than class names because Tailwind classes can change; data attributes are stable test handles.

### Variant and Density Data Attributes

Two tests verify that `data-variant` and `data-density` are applied to the root element. These attributes serve a dual purpose: they enable CSS targeting and act as reliable, semantic test handles that don't break when styling changes.

```typescript
test('defaults to compact density', () => {
  const { container } = render(Card, { props: {} });
  expect(container.querySelector('[data-density="compact"]')).not.toBeNull();
});
```

### Interactive Card: Full Accessibility Contract

This is the most comprehensive test — it verifies the entire interactive surface:

1. The card renders with `role="button"` and `tabindex="0"`
2. Mouse click calls `onclick` once
3. `Enter` keypress calls `onclick`
4. `Space` keypress calls `onclick`

```typescript
await userEvent.keyboard('{Enter}');
expect(onclick).toHaveBeenCalledTimes(2);

await userEvent.keyboard(' ');
expect(onclick).toHaveBeenCalledTimes(3);
```

This matters because cards using `<svelte:element this="button">` must pass the same keyboard expectations as native buttons. The test prevents regressions where the `onKeydown` handler is accidentally removed.

### Non-Interactive with onclick

```typescript
test('non-interactive card has no button role even with onclick', () => {
  render(Card, { props: { title: 'no-op', onclick: () => {} } });
  expect(screen.queryByRole('button')).toBeNull();
});
```

This edge case test confirms the guard `interactive && typeof onclick === 'function'` is enforced. Without it, passing an `onclick` handler alone would silently make the card a button, which could confuse screen reader users.

### aria-pressed for Selected Interactive Cards

```typescript
test('selected variant sets aria-pressed when interactive', () => {
  render(Card, {
    props: { title: 'picked', interactive: true, variant: 'selected', onclick: () => {} },
  });
  expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
});
```

This confirms that toggled/selected state is communicated to assistive technology.

## Known Gaps

- No test covers the `header`, `footer`, or `children` snippet props — those rendering paths are untested.
- No test verifies the `glass` variant's backdrop-filter CSS is applied (would require computed style checks).
- The `style` prop pass-through is not tested.