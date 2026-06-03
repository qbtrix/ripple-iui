---
{
  "title": "Avatar Fallback — Image Load Failure Display",
  "summary": "AvatarFallback is the graceful-degradation layer rendered when an avatar image fails to load or is unavailable. It wraps bits-ui's headless `AvatarPrimitive.Fallback` to inject Ripple's design tokens and size-responsive typography.",
  "concepts": [
    "avatar fallback",
    "image load failure",
    "bits-ui",
    "AvatarPrimitive",
    "graceful degradation",
    "muted tokens",
    "size-responsive typography",
    "loadingStatus",
    "group data attributes",
    "Svelte 5"
  ],
  "categories": [
    "widget",
    "avatar",
    "state-management"
  ],
  "source_docs": [
    "494459fce58f4133"
  ],
  "backlinks": null,
  "word_count": 374,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Network failures, missing profile pictures, and freshly-created accounts that have no uploaded image are all scenarios where rendering a broken image icon would degrade UX. `avatar-fallback.svelte` addresses this by providing a styled, theme-aware placeholder that displays initials or an icon inside the same circular frame the image would have occupied.

## Headless Primitive Delegation

This component does not implement its own visibility logic. It delegates entirely to `AvatarPrimitive.Fallback` from the `bits-ui` library:

```svelte
<AvatarPrimitive.Fallback
  bind:ref
  data-slot="avatar-fallback"
  class={cn("bg-muted text-muted-foreground rounded-full flex size-full items-center justify-center text-sm ...", className)}
  {...restProps}
/>
```

`bits-ui`'s `AvatarPrimitive.Fallback` handles the conditional rendering: it only shows when the parent `AvatarPrimitive.Root`'s `loadingStatus` is `"error"` (image failed) or `"loading"` depending on the library's configuration. Ripple does not need to replicate this state machine — it just styles the output.

## Design Token Usage

The fallback uses `bg-muted` and `text-muted-foreground` — two semantic design tokens rather than hardcoded colors. This means the fallback will automatically match any applied theme without any per-theme override needed. On dark-mode surfaces, `bg-muted` shifts to a dark gray while `text-muted-foreground` lightens — both tracked by CSS custom properties.

## Size-Responsive Typography

The `group-data-[size=sm]/avatar:text-xs` class reduces text size when inside a small avatar:

```
group-data-[size=sm]/avatar:text-xs
```

This is important for initial-based fallbacks like "JD" for "John Doe" — at the default 32px avatar size `text-sm` (14px) is fine, but at the small 24px size it would overflow the circle without this adjustment.

## Full-Size Fill

The `size-full` class ensures the fallback fills the entire parent avatar container rather than sizing to its content. Combined with `flex items-center justify-center`, this centers any child (initials text, user icon SVG) inside the circle.

## Props

The component accepts `AvatarPrimitive.FallbackProps` — the exact type exported by bits-ui — which includes `ref`, `class`, and all standard HTML attributes for the underlying element:

```typescript
let {
  ref = $bindable(null),
  class: className,
  ...restProps
}: AvatarPrimitive.FallbackProps = $props();
```

Note that `children` is not destructured explicitly — bits-ui's fallback type already includes it via standard Svelte snippet typing.

## Known Gaps

No TODOs or FIXMEs. Because fallback visibility is controlled by `bits-ui` internal state, there is no way to force the fallback visible for testing without triggering an actual image load failure or passing a broken `src`.