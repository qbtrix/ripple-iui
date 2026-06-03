---
{
  "title": "Avatar Widget — User Image with Fallback Initials",
  "summary": "A display widget that renders a user or entity avatar using shadcn's Avatar component, automatically falling back to a placeholder character when the image is absent or fails to load. Supports inline style objects passed as records, which it serializes to a CSS style string.",
  "concepts": [
    "avatar",
    "image fallback",
    "shadcn",
    "style serialization",
    "initials",
    "profile image",
    "Svelte 5 derived"
  ],
  "categories": [
    "widget",
    "display"
  ],
  "source_docs": [
    "fad50e2d3bf9215e"
  ],
  "backlinks": null,
  "word_count": 386,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Avatars appear throughout Ripple UIs — in user lists, chat headers, profile cards, and team directories. The Avatar widget wraps shadcn's `Avatar.Root` / `Avatar.Image` / `Avatar.Fallback` trio behind a flat, schema-friendly prop interface so specs can declare an avatar without knowing the underlying component library's API.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | — | Image URL |
| `alt` | `string` | `''` | Accessible alt text |
| `fallback` | `string` | `'?'` | Character(s) shown when image is absent or broken |
| `id` | `string` | — | DOM id for targeting |
| `class` | `string` | — | Additional CSS classes |
| `style` | `Record<string, string>` | — | Inline styles as a key-value map |

## Fallback Behavior

The `Avatar.Fallback` slot renders whenever `Avatar.Image` fails to load or when `src` is not provided. The default fallback is `'?'`, which provides a neutral placeholder. Spec authors typically set `fallback` to initials (e.g., `"PK"`) for a more personalized experience.

Shadcn's avatar implementation handles the image load/error lifecycle internally — the Ripple wrapper does not need to manage error state.

## Style Object Serialization

Ripple specs express styles as JSON objects:

```json
{ "width": "48px", "border": "2px solid gold" }
```

The `styleString` derived value serializes this to a valid HTML style string:

```typescript
const styleString = $derived(
  style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
);
```

This conversion is necessary because Svelte's `style` attribute accepts a string, not an object, when set dynamically. Passing `undefined` (when no style is provided) avoids generating an empty `style=""` attribute.

## Integration with shadcn

The component uses shadcn's pre-built Avatar primitive rather than building a custom image-with-fallback from scratch. This ensures consistent behavior (loading state, error handling, accessibility patterns) without duplicating logic. The Ripple wrapper adds only the style-object-to-string conversion and the `cn()` class merging.

## Known Gaps

- **No size prop**: Avatar size is controlled entirely through `class` or `style` props. There is no convenience `size` prop (e.g., `size="sm" | "md" | "lg"`) that would map to fixed pixel values. Spec authors must know the right CSS values.
- **Fallback text truncation**: For long fallback strings, shadcn's component may overflow the avatar circle. The component does not cap `fallback` length.