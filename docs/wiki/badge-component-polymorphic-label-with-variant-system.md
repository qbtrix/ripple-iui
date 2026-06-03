---
{
  "title": "Badge Component — Polymorphic Label with Variant System",
  "summary": "Badge is a compact label component that renders as either a `\u003cspan\u003e` or `\u003ca\u003e` depending on whether an `href` prop is provided. It uses `tailwind-variants` to expose six visual styles and supports inline icon placement with automatic icon sizing and padding adjustments.",
  "concepts": [
    "badge",
    "polymorphic element",
    "tailwind-variants",
    "svelte:element",
    "badgeVariants",
    "BadgeVariant",
    "inline icon",
    "focus ring",
    "aria-invalid",
    "Svelte 5 module"
  ],
  "categories": [
    "widget",
    "label",
    "interactive"
  ],
  "source_docs": [
    "f8c8c618002c21ad"
  ],
  "backlinks": null,
  "word_count": 400,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Badges annotate content items with categorical labels, statuses, or counts. They appear in tables, cards, and navigation items. `badge.svelte` exists to standardise this pattern — without a shared badge, teams end up with inconsistent label pills scattered across the codebase with varying border radii, font sizes, and color semantics.

## Polymorphic Element Rendering

The most distinctive design decision is the `<svelte:element>` polymorphism:

```svelte
<svelte:element
  this={href ? "a" : "span"}
  bind:this={ref}
  data-slot="badge"
  {href}
  class={cn(badgeVariants({ variant }), className)}
  {...restProps}
>
  {@render children?.()}
</svelte:element>
```

When `href` is provided, the badge renders as a real `<a>` tag — semantically correct for clickable badges that navigate. When `href` is absent, it renders as a `<span>` — semantically correct for decorative or informational labels. This prevents the accessibility anti-pattern of styling a `<div>` as a link or adding click handlers to non-interactive elements.

## Variant System

Variants are defined using `tailwind-variants` in the module-level script block:

```typescript
export const badgeVariants = tv({
  base: "...",
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground ...",
      secondary: "bg-secondary text-secondary-foreground ...",
      destructive: "bg-destructive/10 text-destructive ...",
      outline: "border-border text-foreground ...",
      ghost: "hover:bg-muted ...",
      link: "text-primary underline-offset-4 hover:underline",
    },
  },
});
```

- **default** — primary-colored fill; the most attention-drawing variant
- **secondary** — muted fill for secondary metadata
- **destructive** — red-tinted; signals errors or dangerous states
- **outline** — border only; least visual weight
- **ghost** — invisible until hover; useful for interactive but unobtrusive labels
- **link** — text-only with underline; for purely navigational badges

## Icon Support with Adaptive Padding

The base classes include data-attribute-driven padding adjustments:

```
has-data-[icon=inline-end]:pr-1.5
has-data-[icon=inline-start]:pl-1.5
```

When a child icon has `data-icon="inline-start"` or `data-icon="inline-end"`, the badge reduces padding on that side to account for the icon's visual weight. Without this, badges with icons have asymmetric optical weight.

## Accessibility and Focus

The base includes full focus-visible ring styling and `aria-invalid` handling:

```
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
aria-invalid:ring-destructive/20 aria-invalid:border-destructive
```

This means badges used as interactive anchor elements inside forms get proper focus indicators and can visually indicate validation errors.

## Known Gaps

No TODOs or FIXMEs. The `[a]:hover:` selector syntax is used for hover states on link variants, which requires the parent to be an `<a>` element. This works correctly with polymorphic rendering but will be silently inert when the badge renders as a `<span>` — a subtle gotcha for developers who add `[a]:hover:` classes to the `className` prop without an `href`.