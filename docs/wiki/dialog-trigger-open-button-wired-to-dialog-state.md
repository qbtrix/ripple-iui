---
{
  "title": "Dialog Trigger — Open Button Wired to Dialog State",
  "summary": "A thin wrapper around bits-ui's `DialogPrimitive.Trigger` that opens the parent dialog when activated. Defaults `type` to `\"button\"` to prevent accidental form submissions, and exposes a bindable ref for DOM access.",
  "concepts": [
    "dialog trigger",
    "type=button",
    "form submission prevention",
    "bits-ui Trigger",
    "bindable ref",
    "open state",
    "Svelte 5 runes",
    "defensive default",
    "focus management"
  ],
  "categories": [
    "dialog",
    "interaction",
    "ui-component"
  ],
  "source_docs": [
    "7b72b3d7fc35bf00"
  ],
  "backlinks": null,
  "word_count": 283,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`DialogTrigger` is the element users click to open a dialog. It delegates entirely to `DialogPrimitive.Trigger`, which handles connecting the click event to the parent `Dialog.Root`'s open state. The component's own code is minimal — but its existence as a named Ripple component is important for the same reasons as `DialogPortal`: a consistent import surface and an extensibility seam.

## The `type="button"` Default

The most meaningful default in this component is:

```svelte
let {
  ref = $bindable(null),
  type = "button",
  ...restProps
}: DialogPrimitive.TriggerProps = $props();
```

HTML buttons inside a `<form>` default to `type="submit"`. If a developer wraps a dialog trigger inside a form (common in settings panels or wizard flows), an untyped button would submit the form instead of opening the dialog. Setting `type="button"` as the default explicitly prevents this without requiring every caller to remember to add `type="button"` themselves.

This is a defensive pattern against a silent failure: the dialog simply would not open, and the form would submit, which could be a destructive side effect depending on the form's action.

## ref Forwarding

The `bind:ref` exposes the underlying trigger DOM node. Common uses:
- Returning focus to the trigger after the dialog closes (bits-ui may handle this automatically, but explicit ref access allows overrides)
- Programmatic trigger activation in tests or automation

## Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `ref` | `HTMLButtonElement \| null` | `null` | Bindable DOM ref |
| `type` | `"button" \| "submit" \| "reset"` | `"button"` | Prevents form submission |
| `...restProps` | `DialogPrimitive.TriggerProps` | — | Forwarded to bits-ui |

## Known Gaps

None. The `type` default is the only substantive logic; everything else is pass-through.