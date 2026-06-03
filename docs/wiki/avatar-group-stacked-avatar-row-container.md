---
{
  "title": "Avatar Group — Stacked Avatar Row Container",
  "summary": "AvatarGroup is the layout container that stacks multiple Avatar components into the familiar overlapping-circles row. It establishes the CSS context that child avatars and the overflow count indicator query for size coordination, and applies negative spacing to create the overlapping effect.",
  "concepts": [
    "avatar group",
    "negative spacing",
    "flex layout",
    "group context",
    "slot targeting",
    "ring injection",
    "CSS child selectors",
    "overflow truncation",
    "data-slot",
    "Svelte 5"
  ],
  "categories": [
    "widget",
    "avatar",
    "layout"
  ],
  "source_docs": [
    "6f607bb46fbd32f8"
  ],
  "backlinks": null,
  "word_count": 361,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Displaying a list of people using circular avatars is a common UI pattern (GitHub contributors, Slack workspace members, Figma file collaborators). The visual expectation is that the avatars partially overlap each other horizontally. `avatar-group.svelte` provides the container that makes this work without requiring each avatar to know about its neighbors.

## Negative Spacing for Overlap

The core layout mechanism is `flex -space-x-2`:

```svelte
<div
  data-slot="avatar-group"
  class={cn(
    "cn-avatar-group *:data-[slot=avatar]:ring-background group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2",
    className
  )}
>
```

`-space-x-2` applies a negative left margin to every flex child, pulling each subsequent avatar 8px beneath the previous one. This creates the overlapping stack without absolute positioning.

## Scoped Ring Injection via Child Selectors

The parent uses attribute-targeted child selectors to inject `ring-2` and `ring-background` onto every direct avatar child:

```
*:data-[slot=avatar]:ring-2
*:data-[slot=avatar]:ring-background
```

This is a defensive design: rather than requiring each `<Avatar>` to know it is inside a group and self-apply ring styles, the container applies them from the outside. If a `data-[slot=avatar]` element does not have these classes, it will still receive them via cascade from this parent rule. This prevents visual inconsistency if someone forgets to configure individual avatars when placing them in a group.

## CSS Group Context

The `group/avatar-group` class establishes a named CSS group scope. Child components like `AvatarGroupCount` can then query this scope using `group-has-data-[size=...]/avatar-group` selectors to inherit the group's size without prop drilling. The group itself does not set a `data-size` attribute — that is passed by the parent or rendered AI agent — but it acts as the anchor point for child size queries.

## Slot-Based Targeting

All Ripple UI components use `data-slot` attributes as stable CSS hooks. This avoids class-name collisions and lets parent containers target specific child component types. The selector `*:data-[slot=avatar]` matches only `<Avatar>` roots, not badges, fallbacks, or other inner elements.

## Known Gaps

The component does not enforce a maximum number of visible avatars — that truncation logic lives in the consumer. There is also no built-in `AvatarGroupCount` injection; consumers must manually append a `<AvatarGroupCount>` element when overflow exists. A higher-level wrapper that accepts an array of user objects and auto-truncates would improve ergonomics for common use cases.