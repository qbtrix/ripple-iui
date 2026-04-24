---
{
  "title": "Avatar Group Count — Overflow Indicator for Avatar Stacks",
  "summary": "AvatarGroupCount renders the overflow indicator at the end of an avatar stack — the '+5' or similar count shown when a group has more members than the display limit. It mirrors the circular shape and sizing of sibling avatars while reading the group's size tier from a parent CSS group selector.",
  "concepts": [
    "avatar group count",
    "overflow indicator",
    "has-data CSS selector",
    "avatar stack",
    "group context sizing",
    "ring separator",
    "icon scaling",
    "WithElementRef",
    "Svelte 5 runes",
    "accessibility"
  ],
  "categories": [
    "widget",
    "avatar",
    "layout"
  ],
  "source_docs": [
    "91a12673c9cfd941"
  ],
  "backlinks": null,
  "word_count": 380,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

When displaying a list of collaborators, participants, or team members using stacked avatars, it is impractical to show every member when the list exceeds 3-5 items. `avatar-group-count.svelte` provides the visual cap: a circle styled identically to the avatars in the group, but containing a numeric overflow label like "+12".

Critically, this component must match the visual weight and size of real avatars in the same row. Getting the sizing wrong creates visual inconsistency that makes the entire group look broken. The component solves this by reading its size from the parent `AvatarGroup` context rather than accepting its own size prop.

## Size Inheritance via Parent Group Selectors

The component uses `group-has-data-[size=...]` selectors on the parent `avatar-group` element rather than direct `data-size` on itself:

```
size-8  (default 32px)
group-has-data-[size=lg]/avatar-group:size-10  → 40px when group is large
group-has-data-[size=sm]/avatar-group:size-6   → 24px when group is small
```

This is important because the count bubble is a sibling of the avatars, not a child. Direct `data-size` lookups via `group-data-[...]` would only work for a direct parent. The `has-data` variant allows a grandparent (`AvatarGroup`) to broadcast its size to all descendant elements that opt into that query — including this sibling-level count element.

## Icon Scaling

The component also scales SVG icons proportionally:

```
[&>svg]:size-4
group-has-data-[size=lg]/avatar-group:[&>svg]:size-5
group-has-data-[size=sm]/avatar-group:[&>svg]:size-3
```

This allows the count indicator to host an icon (such as a "more users" icon) instead of or alongside a numeric label.

## Ring Border for Visual Separation

Like individual avatars and avatar badges, the count circle uses `ring-2 ring-background` to create a thin separation ring between itself and adjacent avatars. Without this ring, the flat background colors of adjacent circles blend at their edges, making it hard to visually parse individual items in dense stacks.

## Props

```typescript
let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
```

The component renders a `div` (not a `span` as might be expected) because count indicators may contain block-level content or need flex layout internally.

## Known Gaps

The count component has no built-in accessibility support — it renders no `aria-label` or `title` by default. A count of "+5" is visually meaningful but screen readers will read it as the literal character sequence. Consumers should pass `aria-label="5 more members"` via `restProps` when accessibility is required.