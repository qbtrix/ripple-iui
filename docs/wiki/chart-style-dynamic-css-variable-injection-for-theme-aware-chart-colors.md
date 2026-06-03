---
{
  "title": "Chart Style — Dynamic CSS Variable Injection for Theme-Aware Chart Colors",
  "summary": "ChartStyle generates and injects a `\u003cstyle\u003e` block at runtime that maps chart series identifiers to CSS custom properties, supporting both light and dark theme variants. It is a headless utility component — it produces no visible DOM, only scoped CSS.",
  "concepts": [
    "chart-style",
    "CSS variable injection",
    "dynamic style tag",
    "THEMES constant",
    "dark mode",
    "ChartConfig",
    "svelte:element",
    "data-chart scoping",
    "$derived.by",
    "LayerChart integration"
  ],
  "categories": [
    "chart",
    "theming",
    "data-visualization"
  ],
  "source_docs": [
    "3edcc54afe54c006"
  ],
  "backlinks": null,
  "word_count": 388,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`chart-style.svelte` solves a specific problem: chart libraries use their own internal color systems that don't read Tailwind design tokens or CSS custom properties directly. ChartStyle bridges that gap by generating scoped CSS that maps ripple's `ChartConfig` color definitions onto CSS variables the chart library can consume.

## The Color Injection Problem

LayerChart and similar chart libraries accept colors as explicit values (hex, rgb, hsl strings). They don't natively read CSS variables. But ripple's design tokens are CSS variables, and chart colors should respect dark mode. ChartStyle generates a `<style>` tag with rules like:

```css
 [data-chart=chart-abc123] {
  --color-revenue: #3b82f6;
  --color-expenses: #ef4444;
}
.dark [data-chart=chart-abc123] {
  --color-revenue: #60a5fa;
  --color-expenses: #fca5a5;
}
```

This scopes colors to the exact chart instance (`data-chart` ID) and separates light/dark values. Chart sub-components then reference `var(--color-revenue)` rather than hardcoded values.

## THEMES Constant

```typescript
export const THEMES = { light: "", dark: ".dark" } as const;
```

The `light` key maps to an empty prefix (rules apply globally), while `dark` maps to `.dark` (rules apply under the `.dark` class). Iterating over `Object.entries(THEMES)` generates both theme blocks in one pass.

## Reactive Derivation

```svelte
const colorConfig = $derived(
  config ? Object.entries(config).filter(([, config]) => config.theme || config.color) : null
);
```

Only entries with color or theme definitions are included — non-color config entries (label-only or icon-only series) are filtered out. This prevents empty `--color-undefined: ;` declarations.

```svelte
const themeContents = $derived.by(() => { ... });
```

`$derived.by` is used (instead of `$derived`) because the derivation involves a multi-step loop that cannot be expressed as a single expression. The result is a single string of CSS ready for injection.

## Dynamic `<style>` Tag with `{#key}`

```svelte
{#key id}
  <svelte:element this={"style"}>
    {themeContents}
  </svelte:element>
{/key}
```

`svelte:element` with `this={"style"}` is required because Svelte's template parser doesn't allow raw `<style>` tags inside component templates (they're treated as component-scoped CSS). This is a deliberate workaround.

The `{#key id}` block forces the style element to be fully recreated (not patched) when the chart ID changes. This prevents stale CSS from a previous chart ID persisting in the DOM when the component is reused with a new ID.

## Known Gaps

The fallback priority is `theme[_theme] || itemConfig.color` — if both are defined, the theme-specific value wins. There is no warning if both are provided simultaneously, which could cause unexpected overrides.
