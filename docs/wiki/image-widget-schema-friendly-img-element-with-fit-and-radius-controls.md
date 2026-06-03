---
{
  "title": "Image Widget — Schema-Friendly img Element with Fit and Radius Controls",
  "summary": "A display widget that renders a native `\u003cimg\u003e` element with declarative control over object-fit behavior, border radius, and dimensions via a JSON-serializable prop interface. Converts numeric dimensions to pixel strings and merges inline style objects from spec definitions.",
  "concepts": [
    "image",
    "object-fit",
    "border radius",
    "inline style",
    "schema-driven",
    "dimensions",
    "responsive image",
    "Svelte 5 derived"
  ],
  "categories": [
    "widget",
    "display"
  ],
  "source_docs": [
    "f39f1c51da253568"
  ],
  "backlinks": null,
  "word_count": 476,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Ripple specs need to embed images without writing raw HTML. The Image widget provides a schema-compatible interface for all the common image presentation concerns — how the image fills its container, how its corners are rounded, and what dimensions it occupies — using prop values that JSON can express.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | `''` | Image URL |
| `alt` | `string` | `''` | Accessible alt text |
| `fit` | `'contain' \| 'cover' \| 'fill' \| 'none' \| 'scale-down'` | `'cover'` | CSS object-fit |
| `rounded` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | Border radius preset |
| `width` | `number \| string` | — | Width (number → px, string → verbatim) |
| `height` | `number \| string` | — | Height (number → px, string → verbatim) |
| `style` | `Record<string, string>` | — | Additional inline styles as a key-value map |

## Style Construction

All visual properties are assembled into a single `style` string in the `$derived.by` block:

```typescript
const combinedStyle = $derived.by(() => {
  const s: string[] = [
    `object-fit:${fit}`,
    `border-radius:${radiusMap[rounded] ?? '8px'}`,
  ];
  if (width) s.push(`width:${typeof width === 'number' ? `${width}px` : width}`);
  if (height) s.push(`height:${typeof height === 'number' ? `${height}px` : height}`);
  if (style) s.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
  return s.join(';');
});
```

This handles the common spec pattern where dimensions come from a JSON number (e.g., `"width": 320`) that should become `320px`, while still supporting CSS string values (e.g., `"width": "100%"`) unchanged. Using `$derived.by` ensures the style string is recomputed whenever any input changes.

## Radius Presets

```typescript
const radiusMap: Record<string, string> = {
  none: '0', sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '9999px'
};
```

Presets map to concrete pixel values rather than Tailwind class names because the radius is applied inline (where Tailwind classes don't work). `full` uses `9999px` — the conventional trick for circular/pill shapes that works regardless of the image's actual dimensions.

## `block max-w-full` Base Classes

The image always has `class="block max-w-full"` plus any caller-provided class. `block` prevents the default inline rendering of `<img>` which produces a gap below the image caused by the baseline offset. `max-w-full` ensures images never overflow their container, a critical constraint for responsive layouts.

## Known Gaps

- **No lazy loading**: The component does not set `loading="lazy"` by default. Images in off-screen Ripple widgets will be fetched eagerly. For image-heavy UIs this can impact initial load performance.
- **No error state**: If the `src` is invalid or the load fails, the browser renders a broken image icon. There is no fallback slot or error handler.
- **No aspect ratio enforcement**: Without explicit height, images will use their intrinsic dimensions, which can cause layout shifts (CLS) before the image loads.