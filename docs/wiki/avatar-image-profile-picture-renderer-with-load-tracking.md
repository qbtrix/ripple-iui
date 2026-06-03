---
{
  "title": "Avatar Image — Profile Picture Renderer with Load Tracking",
  "summary": "AvatarImage renders the actual profile picture inside an avatar, delegating load-state tracking to bits-ui's headless primitive. It enforces circular cropping and aspect-ratio preservation so arbitrarily-sized source images always fit the circular frame correctly.",
  "concepts": [
    "avatar image",
    "object-cover",
    "aspect-square",
    "rounded-full",
    "bits-ui",
    "AvatarPrimitive",
    "load state",
    "loadingStatus",
    "image cropping",
    "replaced element"
  ],
  "categories": [
    "widget",
    "avatar",
    "media"
  ],
  "source_docs": [
    "6efed981b86d87a5"
  ],
  "backlinks": null,
  "word_count": 364,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Profile pictures come from user uploads and third-party sources (Gravatar, social auth providers) in unpredictable dimensions and aspect ratios. Without specific rendering constraints, a 600x400 landscape photo would distort inside a 32x32 circular avatar frame. `avatar-image.svelte` prevents this by applying fixed cropping rules at the component level rather than relying on consumers to get it right.

## Primitive Delegation

Like `AvatarFallback`, this component wraps `AvatarPrimitive.Image` from bits-ui:

```svelte
<AvatarPrimitive.Image
  bind:ref
  data-slot="avatar-image"
  class={cn("rounded-full aspect-square size-full object-cover", className)}
  {...restProps}
/>
```

`bits-ui`'s image primitive monitors the underlying `<img>` load events and updates the parent `AvatarPrimitive.Root`'s `loadingStatus` state. Ripple's wrapper does not re-implement this — it only adds visual styling on top.

## Cropping and Aspect Ratio

Three classes work together to handle any source image:

- `aspect-square` — enforces a 1:1 aspect ratio box, preventing the image from stretching in one dimension
- `size-full` — fills the parent avatar container exactly
- `object-cover` — crops the image to fill the box, centering it, rather than letterboxing or distorting

Without `object-cover`, a portrait image would either be squashed horizontally or show letterbox bars. Without `aspect-square`, a pre-sized parent might be overridden by the image's intrinsic dimensions.

## Circular Cropping

`rounded-full` applies `border-radius: 9999px` which clips all four corners into a circle. This must be applied on the `<img>` itself (not just on the parent container) because the image is a replaced element — CSS `overflow: hidden` on a parent does not clip replaced content in all browsers without also setting `border-radius` on the replaced element directly.

## Load State Tracking

The parent `<Avatar>` component binds `loadingStatus` two-ways with the root primitive:

```svelte
bind:loadingStatus
```

This means any ancestor can read `loadingStatus` to know whether the image is `"loading"`, `"loaded"`, or `"error"`. The `AvatarFallback` only renders when status is not `"loaded"`. This coordination happens through the bits-ui primitive layer — `AvatarImage` itself is a passive participant that just renders the image and fires the state transitions.

## Known Gaps

No TODOs or FIXMEs. The component does not expose an `onLoad` or `onError` callback shortcut — consumers who need to react to image load results must pass `onload` and `onerror` via `restProps`, which works but is undiscoverable.