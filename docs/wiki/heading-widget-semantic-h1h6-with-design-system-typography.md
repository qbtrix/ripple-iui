---
{
  "title": "Heading Widget — Semantic H1–H6 with Design System Typography",
  "summary": "A typography widget that renders the correct semantic heading element (h1–h6) based on a `level` prop, with each level pre-mapped to a consistent Tailwind typography scale. Solves the problem of AI-generated specs needing to express hierarchy without embedding raw HTML tags.",
  "concepts": [
    "heading",
    "typography",
    "semantic HTML",
    "h1-h6",
    "text hierarchy",
    "design system",
    "Tailwind typography",
    "schema-driven UI",
    "level mapping"
  ],
  "categories": [
    "widget",
    "display",
    "typography"
  ],
  "source_docs": [
    "3e65488ade157708"
  ],
  "backlinks": null,
  "word_count": 370,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

JSON specs cannot embed raw HTML. When a spec needs a section title, it cannot write `<h2>`. The Heading widget bridges this gap: spec authors declare `{ "type": "Heading", "level": 2, "text": "Overview" }` and the component emits the correct `<h2>` element with appropriate typography classes.

Beyond spec compatibility, centralizing heading styles ensures that every level-2 heading in every Ripple-generated UI looks identical — consistent weight, size, and tracking — without relying on global CSS that could be overridden.

## Level to Typography Mapping

```typescript
const levelClasses: Record<number, string> = {
  1: 'text-3xl font-bold tracking-tight text-foreground',
  2: 'text-2xl font-bold tracking-tight text-foreground',
  3: 'text-xl font-semibold tracking-tight text-foreground',
  4: 'text-lg font-semibold text-foreground',
  5: 'text-base font-semibold text-foreground',
  6: 'text-sm font-semibold uppercase tracking-wider text-muted-foreground',
};
```

Notable design decisions:
- **Levels 1–3** use `tracking-tight` for denser, more impactful headings.
- **Level 6** shifts to uppercase with `tracking-wider` and `text-muted-foreground`, making it behave as a section label or category caption rather than a structural heading — a common pattern in data dashboards.
- All levels set `m-0` to suppress browser default heading margins, giving layout control entirely to the parent container.
- `text-foreground` ensures headings adapt to light/dark themes through CSS custom properties.

## Template Branch Strategy

The template uses explicit `{#if level === N}` branches rather than a dynamic tag:

```svelte
{#if level === 1}
  <h1 ...>{text}</h1>
{:else if level === 2}
  <h2 ...>{text}</h2>
...
```

Svelte 5 does not support dynamic element tags natively in the same ergonomic way as React (no `<svelte:element this="h{level}">`... well, it does via `<svelte:element>` but that requires runtime tag construction). The explicit branch approach is verbose but produces optimal compiled output with no runtime tag resolution overhead, and the compiler can type-check each element correctly.

## ID Support

The `id` prop is forwarded to the rendered element, enabling in-page anchor links (`#section-title`) for documents or multi-section UIs.

## Known Gaps

- **Text-only**: The widget renders the `text` prop as a plain string. Rich heading content (icons, badges, sub-labels inline with headings) would require a snippet-based approach not currently supported.
- **No slot for sub-headings**: A common pattern (a large heading with a smaller description directly beneath) cannot be composed without a wrapper element in the spec.