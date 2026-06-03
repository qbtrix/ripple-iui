---
{
  "title": "Button Component — Polymorphic Interactive Element with Full Variant and Size Matrix",
  "summary": "Button is a fully polymorphic interactive component that renders as either a native `\u003cbutton\u003e` or an `\u003ca\u003e` element, with a comprehensive variant and size matrix defined via `tailwind-variants`. It includes accessibility-correct disabled state handling for link mode and a detailed icon sizing system for inline icon buttons.",
  "concepts": [
    "button",
    "polymorphic element",
    "buttonVariants",
    "ButtonVariant",
    "ButtonSize",
    "disabled anchor",
    "aria-disabled",
    "tailwind-variants",
    "icon sizing",
    "Svelte 5 module"
  ],
  "categories": [
    "widget",
    "interactive",
    "form"
  ],
  "source_docs": [
    "267a2464cdf4a5cc"
  ],
  "backlinks": null,
  "word_count": 453,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

A consistent, accessible button is one of the most reused UI primitives. Without a shared button, applications accumulate divergent button implementations — some with focus rings, some without; some handling disabled anchor states correctly, most not. `button.svelte` standardises interactive elements across the entire Ripple runtime.

## Polymorphic Rendering

The component conditionally renders as `<a>` or `<button>` based on the presence of `href`:

```svelte
{#if href}
  <a bind:this={ref} data-slot="button" href={disabled ? undefined : href}
     aria-disabled={disabled} role={disabled ? "link" : undefined}
     tabindex={disabled ? -1 : undefined} ...>
    {@render children?.()}
  </a>
{:else}
  <button bind:this={ref} data-slot="button" {type} {disabled} ...>
    {@render children?.()}
  </button>
{/if}
```

The disabled anchor handling is particularly careful. HTML `<a>` elements do not have a native `disabled` attribute — browsers ignore it. Naively setting `disabled` on an anchor still allows keyboard navigation and click activation. This component handles all three aspects of disabling an anchor:

1. `href={disabled ? undefined : href}` — removes the URL so the link goes nowhere
2. `aria-disabled={disabled}` — signals to screen readers that the link is non-interactive
3. `role={disabled ? "link" : undefined}` — prevents role promotion when used in specific ARIA contexts
4. `tabindex={disabled ? -1 : undefined}` — removes the anchor from the tab sequence

## Variant System

Six visual variants map to semantic use cases:

- **default** — primary action; most prominent
- **outline** — secondary action; bordered, lower visual weight
- **secondary** — complementary action
- **ghost** — minimal; used in toolbars or dense UIs
- **destructive** — danger confirmation; red-tinted
- **link** — text-only with underline; for inline text-like actions

## Size Matrix

Eight sizes cover every context from dense data tables to touch-friendly mobile layouts:

| Size | Height | Use Case |
|---|---|---|
| `xs` | 24px | Dense data table actions |
| `sm` | 28px | Compact cards, sidebars |
| `default` | 32px | Standard UI |
| `lg` | 36px | Hero CTAs |
| `icon` | 32px | Square icon-only button |
| `icon-xs` | 24px | Small icon button |
| `icon-sm` | 28px | Medium icon button |
| `icon-lg` | 36px | Large icon button |

Icon sizes automatically scale SVGs that do not have an explicit `size-*` class, preventing oversized icons from breaking button proportions.

## Default Type Safety

`type = "button"` is the default. This prevents the notorious form submission bug where a button inside a `<form>` without an explicit `type` defaults to `"submit"` in all browsers — accidentally submitting forms when users click non-submit action buttons.

## Known Gaps

No TODOs or FIXMEs. The `active:translate-y-px` press feedback may conflict with custom animation libraries that also transform the button element. Consumers implementing animated buttons should test for transform composition issues.