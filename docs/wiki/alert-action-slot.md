---
{
  "title": "Alert Action Slot",
  "summary": "AlertAction is a positioning wrapper that places action content (typically a dismiss button or a CTA link) in the top-right corner of an alert. It works in conjunction with the parent `Alert` component's `has-data-[slot=alert-action]:pr-18` rule to prevent the alert body text from overlapping the action.",
  "concepts": [
    "alert",
    "alert action",
    "absolute positioning",
    "data-slot",
    "has-[] variant",
    "Tailwind CSS",
    "WithElementRef",
    "cn utility",
    "conditional padding",
    "compound component"
  ],
  "categories": [
    "widget",
    "layout"
  ],
  "source_docs": [
    "3ce21c363c16a634"
  ],
  "backlinks": null,
  "word_count": 456,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`alert-action.svelte` renders a `<div>` absolutely positioned at `top-2 right-2` inside an alert. It is the designated slot for interactive controls that belong to the alert but should not flow inline with the alert's description text.

## Position and Padding Coordination

The alert action uses `position: absolute` (`absolute top-2 right-2`). For this to work correctly, the parent `Alert` component must have `position: relative` — which it does via the `relative` Tailwind class in `alertVariants`.

More importantly, `Alert` also applies `has-data-[slot=alert-action]:pr-18` — a conditional padding-right that only activates when an `AlertAction` is present (detected via the `data-slot="alert-action"` attribute). This prevents the alert description text from running under the action element. Without this padding, long descriptions would be visually clipped by the absolutely positioned action button.

This is a CSS container-query-like pattern: the presence of a child element modifies the parent's layout without JavaScript. The `has-[]` Tailwind variant checks the DOM structure at style computation time.

## Props

| Prop | Type | Notes |
|------|------|-------|
| `ref` | `HTMLDivElement` (bindable) | Direct DOM reference |
| `class` | `string` | Merged with base positioning classes |
| `children` | snippet | Action content (button, link, icon) |
| `...restProps` | spread | Any valid `HTMLDivElement` attributes |

The `WithElementRef` utility type adds the `ref` binding to the standard HTML div attribute set. This is a Ripple convention for all leaf wrapper components.

## `data-slot` Attribute

`data-slot="alert-action"` is what triggers the parent alert's conditional `pr-18` padding. Removing this attribute would cause the padding to disappear and text would overlap the action. This is an implicit coupling between `AlertAction` and `Alert` — the slot name is part of the behavioral contract, not just a test/theming hook.

## Typical Usage

```svelte
<Alert>
  <AlertTitle>Heads up</AlertTitle>
  <AlertDescription>Your session expires in 5 minutes.</AlertDescription>
  <AlertAction>
    <button onclick={dismiss}>Dismiss</button>
  </AlertAction>
</Alert>
```

## Accessibility Considerations

Since `AlertAction` renders as a generic `<div>`, it does not contribute ARIA roles or semantics. The actual interactive elements inside (buttons, links) carry their own roles. Callers should ensure action buttons have accessible labels, especially icon-only dismiss buttons which should include `aria-label="Dismiss"` or equivalent.

The absolutely positioned action is at `top-2 right-2`, which means it is visually overlaid on the alert. Tab order is determined by DOM order, not visual position — if `AlertAction` appears last in the DOM (after title and description), keyboard users will encounter it last, which is the natural reading order and generally correct.

## Known Gaps

The absolute positioning assumes the `Alert` is a containing block (i.e., has `position: relative` or similar). If an `AlertAction` is used inside a custom alert wrapper that does not establish a containing block, the action will escape to the nearest positioned ancestor. There is no runtime guard against this.