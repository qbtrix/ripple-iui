---
{
  "title": "Radio Group Item — Accessible Option with Visual Check Indicator",
  "summary": "A styled radio button option that wraps bits-ui's `RadioGroup.Item` primitive, rendering a circular border that fills with the primary color when selected, with a `CircleIcon` indicator that appears conditionally via Svelte 5 snippets. It handles checked, focused, disabled, and invalid states through data attributes and ARIA-driven Tailwind variants.",
  "concepts": [
    "radio group item",
    "data-checked",
    "ARIA invalid",
    "snippet render props",
    "hit target expansion",
    "after pseudo-element",
    "CircleIcon",
    "WithoutChildrenOrChild",
    "bits-ui RadioGroup",
    "Tailwind data attributes"
  ],
  "categories": [
    "widget",
    "form",
    "accessibility"
  ],
  "source_docs": [
    "48e06d4d1b62863c"
  ],
  "backlinks": null,
  "word_count": 382,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`radio-group-item.svelte` renders a single selectable option within a radio group. Its visual design is a 16x16 pixel circular button that changes background and border color when selected. The selection indicator is a smaller filled circle (`CircleIcon`) rendered absolutely centered within the button using a Svelte 5 `{#snippet}` block.

## Visual State Machine

The component drives all visual states through Tailwind data-attribute and ARIA variants rather than reactive JavaScript state:

| State | Mechanism | Visual Change |
|---|---|---|
| Default | No modifier | `border-input` neutral border |
| Checked | `data-checked` | `bg-primary`, `text-primary-foreground`, `border-primary` |
| Focused | `focus-visible:` | `border-ring`, `ring-3` focus ring |
| Disabled | `[disabled]` | `cursor-not-allowed`, `opacity-50` |
| Invalid | `aria-invalid` | `border-destructive`, destructive ring |
| Invalid + Checked | `aria-invalid:aria-checked:` | `border-primary` overrides destructive border |

The invalid + checked combination is significant: it ensures that if a field is marked invalid but the user has made a selection, the checked state's primary color takes visual precedence. Without this rule, a checked item in an invalid form field would show a red border, which is confusing — the item itself is not the error source.

## Snippet-Based Indicator Pattern

```svelte
<RadioGroupPrimitive.Item ...>
  {#snippet children({ checked })}
    <div data-slot="radio-group-indicator" class="flex size-4 items-center justify-center">
      {#if checked}
        <CircleIcon class="bg-primary-foreground absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
      {/if}
    </div>
  {/snippet}
</RadioGroupPrimitive.Item>
```

The bits-ui primitive exposes a `checked` boolean through the snippet's render props. Using `{#if checked}` keeps the `CircleIcon` out of the DOM entirely when unselected, which matters for screen reader announcements — a hidden icon avoids extraneous accessible text.

## Hit Target Expansion

The `after:absolute after:-inset-x-3 after:-inset-y-2` classes add an invisible `::after` pseudo-element that extends the tappable/clickable area beyond the visible 16px circle. This is a touch accessibility pattern: small circular targets are hard to hit on mobile, so the hit target is expanded without changing the visual size.

## The `WithoutChildrenOrChild` Constraint

Accepting `WithoutChildrenOrChild<RadioGroupPrimitive.ItemProps>` strips the `children` and `child` props from the external type. The component owns its internal rendering completely — consumer-provided children would have nowhere to render and would be silently dropped. Removing them from the type surface makes this constraint explicit and enforced at compile time.

## Known Gaps

No known gaps. All standard states are handled.