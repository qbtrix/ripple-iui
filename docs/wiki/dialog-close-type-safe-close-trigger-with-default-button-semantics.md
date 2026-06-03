---
{
  "title": "Dialog Close — Type-Safe Close Trigger with Default Button Semantics",
  "summary": "DialogClose is a minimal wrapper around bits-ui's `Dialog.Close` primitive. Its sole substantive addition is defaulting `type` to `\"button\"` — a defensive fix that prevents form submission side effects when the close trigger is rendered inside a `\u003cform\u003e` element.",
  "concepts": [
    "dialog-close",
    "bits-ui Dialog",
    "type=button default",
    "form submission prevention",
    "data-slot",
    "WithElementRef",
    "close trigger",
    "dialog accessibility",
    "Svelte 5 $props",
    "restProps spread"
  ],
  "categories": [
    "widget",
    "dialog",
    "accessibility"
  ],
  "source_docs": [
    "4a9a1a6327d4e68f"
  ],
  "backlinks": null,
  "word_count": 348,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`dialog-close.svelte` wraps bits-ui's `DialogPrimitive.Close` to add a single critical default: `type="button"`. While thin, this component encapsulates a common web platform footgun and ensures it's handled consistently across every use of the close trigger.

## The `type="button"` Default

```svelte
let {
  ref = $bindable(null),
  type = "button",
  ...restProps
}: DialogPrimitive.CloseProps = $props();
```

In HTML, a `<button>` element inside a `<form>` defaults to `type="submit"`. This means any close button inside a dialog that wraps a form would accidentally submit the form when clicked — closing the dialog and triggering form submission simultaneously, often with incomplete or invalid data.

By defaulting `type` to `"button"`, this component ensures the close trigger never submits its containing form unless a consumer explicitly passes `type="submit"`. This is a defensive pattern that prevents a silent, hard-to-debug failure mode.

## `data-slot` for Structural Identification

`data-slot="dialog-close"` marks this element for CSS targeting and structural identification within the dialog system. Parent components like `dialog-content.svelte` may render their own close button using `DialogPrimitive.Close` directly with `data-slot="dialog-close"` — the slot convention ensures consistent targeting regardless of which implementation path is used.

## Minimal Surface Area

The component passes all remaining props through `{...restProps}` to the primitive. It does not add any default styling, aria attributes, or icon content — those concerns belong to the usage site or to `dialog-content.svelte`'s built-in close button. This separation means `dialog-close.svelte` can serve as a plain semantic trigger (e.g. a custom "Cancel" button) without forcing visual opinions on the consumer.

## Bindable `ref`

The `ref` binding allows parent components to programmatically focus the close button (e.g. for focus restoration when a dialog closes) or observe its DOM state without querying the DOM by class or ID.

## Relationship to DialogContent's Built-In Close

`dialog-content.svelte` includes its own `showCloseButton` prop that renders an `XIcon` button using `DialogPrimitive.Close` directly. `dialog-close.svelte` is the separately usable trigger for consumers who want a named "Close" or "Cancel" action inside the dialog body, distinct from the corner X button.

## Known Gaps

None. The component is intentionally minimal — its value is the `type` default and the consistent `data-slot` attribute.
