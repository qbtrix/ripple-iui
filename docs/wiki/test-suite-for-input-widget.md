---
{
  "title": "Test Suite for Input Widget",
  "summary": "Comprehensive Vitest + Testing Library test suite for the Input text widget, covering rendering, label/id association, size and state data attributes, type forwarding, oninput/onchange event firing, error and helper message rendering, accessibility attributes (aria-invalid, aria-describedby), and disabled/required/readOnly attribute forwarding.",
  "concepts": [
    "testing",
    "vitest",
    "testing-library",
    "Input widget",
    "aria-invalid",
    "aria-describedby",
    "label association",
    "oninput vs onchange",
    "error state",
    "attribute forwarding"
  ],
  "categories": [
    "testing",
    "widget",
    "input",
    "accessibility",
    "test"
  ],
  "source_docs": [
    "39800c23fe77e029"
  ],
  "backlinks": null,
  "word_count": 439,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This suite validates `Input.svelte` — Ripple's text input widget — across its full contract surface. It pays particular attention to accessibility attributes and the error/helper message system, which are safety-critical for form validation UX.

## Test Setup

```typescript
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Input from '$lib/widgets/input/Input.svelte';
```

## Rendering and Label Tests

The label-association test is particularly important:

```typescript
test('renders label and associates it with the input via for=id', () => {
  render(Input, { props: { id: 'name', label: 'Full name' } });
  const input = screen.getByLabelText('Full name');
  expect(input).toHaveAttribute('id', 'name');
});
```

`getByLabelText` succeeds only if the label's `for` attribute correctly references the input's `id`. This test would fail if the auto-ID generation broke the label-input association.

## Event Firing Tests

Two tests cover the input/change event distinction:

- **`oninput`:** Fires on each keystroke via `userEvent.type`. The test checks the accumulated value after typing `'hi'`.
- **`onchange`:** Fires on blur (after `userEvent.tab()`). This matches the native HTML `change` event semantics — it fires when the field loses focus after modification.

```typescript
await userEvent.type(input, 'bye');
await userEvent.tab(); // triggers blur
expect(lastCall[0]).toBe('bye');
```

The distinction matters for spec authors: `oninput` is for live validation or autocomplete; `onchange` is for form submission triggers.

## Error State Tests

Four tests cover the error system:

1. **Error sets `data-state="error"`** on the container.
2. **Error sets `aria-invalid="true"`** on the input element.
3. **Error message renders** in `[data-slot="input-error"]` and is linked to the input via `aria-describedby`.
4. **Error overrides helper:** when both `error` and `helper` are present, only the error span renders.

Test 3 is the most thorough:

```typescript
const describedBy = input.getAttribute('aria-describedby');
expect(describedBy).toBeTruthy();
expect(describedBy).toBe(msg!.id);
```

This verifies the full accessibility chain: the input's `aria-describedby` must equal the actual `id` of the error message element, not just any truthy string.

## Attribute Forwarding Tests

- `disabled` → input is disabled and `data-state="disabled"` on container
- `required` → input has `required` attribute
- `readOnly` → input has `readonly` attribute
- `type` → forwarded to input element; defaults to `'text'`
- `size` → reflected as `data-size` on container

## Slot Absence Test

```typescript
test('no prefix slot rendered when prefix snippet is not provided', () => {
  expect(container.querySelector('[data-slot="input-prefix"]')).toBeNull();
});
```

This guards against the prefix container leaking into the DOM when no content is provided, which would leave an empty element inside the input shell.

## Known Gaps

- No test for the `helper` message `aria-describedby` linkage (only error is tested).
- No test for suffix slot rendering.
- No test for the WidgetRegistry `focus` registration (would require providing the `'ui-widget-registry'` context).