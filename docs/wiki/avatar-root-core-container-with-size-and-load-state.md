---
{
  "title": "Avatar Root — Core Container with Size and Load State",
  "summary": "Avatar is the root component in the avatar family, providing the circular container, size tier selection, load status binding, and the pseudo-element border overlay. It coordinates sizing context for child components (image, fallback, badge) and exposes loadingStatus as a bindable prop for parent consumption.",
  "concepts": [
    "avatar root",
    "size system",
    "loadingStatus",
    "bindable prop",
    "pseudo-element border",
    "mix-blend-mode",
    "CSS group context",
    "data-size",
    "bits-ui",
    "Svelte 5 runes"
  ],
  "categories": [
    "widget",
    "avatar",
    "state-management"
  ],
  "source_docs": [
    "2bf307fa3b51ef93"
  ],
  "backlinks": null,
  "word_count": 385,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

The avatar root serves three simultaneous roles: visual container, size context provider, and load state coordinator. Without a single root owning these concerns, each child component would need to receive size as a prop, and the image load fallback logic would have no shared state to read from.

## Size System

The component accepts a `size` prop (`"default" | "sm" | "lg"`) and writes it to a `data-size` attribute:

```svelte
<AvatarPrimitive.Root
  data-size={size}
  class={cn(
    "size-8 ... data-[size=lg]:size-10 data-[size=sm]:size-6",
    className
  )}
/>
```

The three resulting pixel sizes are:
- `sm`: 24px (6 × 4px)
- `default`: 32px (8 × 4px)
- `lg`: 40px (10 × 4px)

By placing `data-size` on the root element, all child components (badge, fallback, image) can read it through CSS group selectors without requiring prop drilling. The root broadcasts its size to the entire subtree via the DOM.

## Load Status Binding

`loadingStatus` is initialized to `"loading"` and declared as bindable:

```svelte
loadingStatus = $bindable("loading")
```

This allows a parent component to read the current load state:

```svelte
<Avatar bind:loadingStatus>
  <AvatarImage src={user.photoURL} />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

If a parent wants to show a spinner elsewhere on the page while the image loads, it can do so by watching `loadingStatus`.

## Pseudo-Element Border Overlay

The `after:` classes add a cosmetic border via a CSS pseudo-element rather than a real `border` property:

```
after:absolute after:inset-0 after:border after:border-border after:rounded-full after:mix-blend-darken dark:after:mix-blend-lighten
```

Why use a pseudo-element instead of `border`? Because `border` sits outside the element box and cannot be clipped by `overflow: hidden` or `border-radius` applied to the element itself. The inset pseudo-element approach places the border inside the circular clip, ensuring the border perfectly follows the circular shape of the image regardless of the avatar size.

The `mix-blend-darken` / `dark:mix-blend-lighten` modes ensure the border is always visible against both light and dark images by blending differently in each mode.

## Group Context

`group/avatar` establishes the named CSS group used by child selectors in `AvatarBadge` and `AvatarFallback`. Svelte and Tailwind's group mechanism requires this specific naming for the scoped group selector queries to work.

## Known Gaps

The `select-none` class prevents text selection on the avatar but is not explained inline — it prevents accidental text selection when the user drags across the avatar stack in `AvatarGroup`. No TODOs or FIXMEs are present.