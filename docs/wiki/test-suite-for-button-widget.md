---
{
  "title": "Test Suite for Button Widget",
  "summary": "Vitest + Testing Library test suite for the Button input widget covering rendering, variant and size data attributes, click event firing, disabled and loading state enforcement, spinner slot rendering, type attribute forwarding, and the data-state machine. Uses userEvent for realistic interaction simulation.",
  "concepts": [
    "testing",
    "vitest",
    "testing-library",
    "userEvent",
    "Button widget",
    "aria-busy",
    "data attributes",
    "disabled state",
    "loading state",
    "type attribute"
  ],
  "categories": [
    "testing",
    "widget",
    "input",
    "test"
  ],
  "source_docs": [
    "278244871fb464ab"
  ],
  "backlinks": null,
  "word_count": 437,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This test suite validates `Button.svelte` — Ripple's primary interactive button widget — across its full behavioral surface. Tests cover both visual attributes and behavioral contracts, using `@testing-library/user-event` for interaction tests to simulate real user input rather than synthetic events.

## Test Setup

```typescript
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Button from '$lib/widgets/input/Button.svelte';
```

## Rendering Tests

The suite opens with basic rendering verification:

- **Label text:** Rendered by role `'button'` with accessible name `'Save'`, which confirms the label text is accessible to screen readers via the button's computed accessible name.
- **Default variant and size:** `data-variant="default"` and `data-size="md"` are present without explicit props.

## Data Attribute Tests

Variant and size tests use `querySelector` on data attributes rather than class names:

```typescript
expect(container.querySelector('[data-variant="destructive"]')).not.toBeNull();
expect(container.querySelector('[data-size="lg"]')).not.toBeNull();
```

This approach decouples tests from Tailwind class strings, which can change during design system updates without changing component behavior.

## Interaction Tests

```typescript
test('fires onclick', async () => {
  const onclick = vi.fn();
  render(Button, { props: { label: 'go', onclick } });
  await userEvent.click(screen.getByRole('button'));
  expect(onclick).toHaveBeenCalledTimes(1);
});
```

Using `userEvent.click` rather than `fireEvent.click` exercises the full browser event pipeline including pointer events, which is important because the Button's `handleClick` guard is an event handler, not a DOM attribute.

## Disabled and Loading State Tests

Three tests verify the disabled/loading behavioral contracts:

1. **Disabled:** Button has `disabled` attribute AND `onclick` is not called on click.
2. **Loading:** Button has `aria-busy="true"`, is disabled (click blocked), AND shows the spinner slot (`data-slot="button-spinner"`).
3. **Click blocked during loading:** `userEvent.click` on a disabled-state button does not invoke the handler.

The loading test is particularly important because it verifies the double-guard: both the HTML `disabled` attribute and the `handleClick` early return work together to prevent action execution.

## Type Attribute Test

```typescript
test('type defaults to "button"', () => {
  expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
});
```

This test guards against a subtle regression: if the default `type` were removed, buttons inside forms would default to `submit` in HTML, causing accidental form submissions when clicked.

## data-state Machine Test

```typescript
test('data-state reflects loading vs disabled vs idle', () => {
  // idle, disabled, loading — each verified independently
});
```

This test verifies all three states of the state machine in one block, confirming that the three-way derivation (`loading ? 'loading' : disabled ? 'disabled' : 'idle'`) works correctly for each combination.

## Known Gaps

- No test for `leading` or `trailing` snippet slots (requires Svelte snippet testing patterns).
- No test for `form` prop association or `name`/`value` forwarding.
- No test verifying `aria-label` forwarding for icon-only buttons.