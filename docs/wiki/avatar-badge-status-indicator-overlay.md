---
{
  "title": "Avatar Badge — Status Indicator Overlay",
  "summary": "AvatarBadge renders a small circular overlay anchored to the bottom-right corner of an avatar, used to convey status (online, offline, notifications). It reads the parent avatar's size via CSS group data attributes and scales itself proportionally, hiding its icon content on small avatars where it would otherwise be illegible.",
  "concepts": [
    "avatar badge",
    "status indicator",
    "group data attributes",
    "absolute positioning",
    "size scaling",
    "CSS group selectors",
    "ring separator",
    "icon suppression",
    "WithElementRef",
    "Svelte 5 runes"
  ],
  "categories": [
    "widget",
    "avatar",
    "layout"
  ],
  "source_docs": [
    "4cbc00caa8e53d1e"
  ],
  "backlinks": null,
  "word_count": 421,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

`avatar-badge.svelte` exists to solve a specific visual problem: conveying user status or notification count without breaking the circular avatar shape. Rather than adding a separate positioned element at the call site, this component encapsulates the absolute positioning, z-index management, and size scaling in one place.

## Rendering Behavior

The badge renders as an absolutely-positioned `<span>` sitting at `right-0 bottom-0` relative to its parent avatar container. The `z-10` class ensures it floats above the avatar image and the avatar's pseudo-element border overlay:

```svelte
<span
  bind:this={ref}
  data-slot="avatar-badge"
  class={cn(
    "bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none",
    ...
  )}
>
  {@render children?.()}
</span>
```

The `ring-2 ring-background` creates a white (or dark-mode surface) ring separating the badge from the avatar image beneath it. Without this ring, the badge would visually merge into the avatar image at certain color combinations — the ring acts as a visual separator that works across all themes.

## Responsive Sizing via Group Data Attributes

This component does not accept a `size` prop directly. Instead it reads size from the parent `<Avatar>` component's `data-size` attribute through CSS group variant selectors:

```
group-data-[size=sm]/avatar:size-2       → 8px dot
group-data-[size=default]/avatar:size-2.5 → 10px dot
group-data-[size=lg]/avatar:size-3       → 12px dot
```

The `/avatar` suffix scopes these group selectors specifically to the nearest ancestor with `group/avatar` — preventing false matches if nested avatars or other group components exist higher in the tree.

## Icon Suppression on Small Avatars

A subtle but important defensive rule hides SVG icons inside the badge when the avatar is small:

```
group-data-[size=sm]/avatar:[&>svg]:hidden
```

A 8px badge cannot legibly display even a small icon — it would render as a blurry smear. Rather than rely on consumers to conditionally omit icon children, the component self-enforces this constraint. Medium and large avatars allow icons at `size-2` and `size-2` respectively.

## Props and Ref Binding

The component accepts the full `HTMLAttributes<HTMLSpanElement>` spread plus the `WithElementRef` pattern, which exposes a bindable `ref` prop for consumers needing direct DOM access (e.g., for tooltip anchoring or animation libraries):

```typescript
let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();
```

The `select-none` class prevents accidental text selection when the badge contains a count number.

## Known Gaps

No TODOs or FIXMEs are present. The `bg-blend-color` class on the badge is an unusual choice — CSS `background-blend-mode` only takes effect when the element has multiple background layers, which this span does not by default. This class appears to be a forward-looking placeholder or may be inert in current usage.