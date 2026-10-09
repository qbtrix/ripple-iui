---
title: Theming
description: Restyle Ripple with your own design tokens, a per-spec theme block, or a brand pack, and how they stack.
order: 2
---

Ripple's widgets are styled with Tailwind v4 and the shadcn token names (`--background`, `--primary`, `--card` and the rest). Change those and every widget follows. There are three places to do it, from broadest to narrowest.

## 1. Your app's CSS

If your app defines shadcn tokens, Ripple uses them. On top of those, `theme.css` adds a small set of `--ripple-*` tokens that default to your shadcn ones. Override a `--ripple-*` token to change Ripple without touching the rest of your app, scoped to a container if you like:

```css
.chat-panel .ripple-root {
  --ripple-surface: transparent;
  --ripple-accent: oklch(0.62 0.19 255);
}
```

The `--ripple-*` tokens:

| Token | Defaults to |
|---|---|
| `--ripple-surface`, `--ripple-surface-foreground` | `--card`, `--card-foreground` |
| `--ripple-popover`, `--ripple-popover-foreground` | `--popover`, `--popover-foreground` |
| `--ripple-muted`, `--ripple-muted-foreground` | `--muted`, `--muted-foreground` |
| `--ripple-accent`, `--ripple-accent-foreground` | `--primary`, `--primary-foreground` |
| `--ripple-border`, `--ripple-ring` | `--border`, `--ring` |
| `--ripple-input`, `--ripple-input-foreground` | `--background`, `--foreground` |
| `--ripple-error`, `--ripple-error-foreground` | `--destructive`, `--destructive-foreground` |
| `--ripple-success`, `--ripple-warning`, `--ripple-info` (and their `-foreground`) | Fixed green, amber and blue |
| `--ripple-radius` | `--radius` |

Dark mode follows a `.dark` class on an ancestor, the same convention shadcn uses. Setup for both cases (with and without your own tokens) is in [Install](/docs/getting-started/install).

## 2. The spec's theme block

A spec can carry a `theme` that applies to that render only. Ripple writes it as CSS custom properties on the render's root element, so it can't leak into the rest of the page:

```json
{
  "theme": {
    "colors": { "primary": "#3b82f6", "background": "#0a0a0a", "foreground": "#fafafa" },
    "radius": "0.75rem",
    "fonts": { "sans": "Inter, sans-serif", "heading": "Fraunces, serif" }
  }
}
```

- **`colors`** keys are the shadcn token names, written without the leading dashes. Each becomes `--<name>` on the root. Values can be any CSS colour: hex, `oklch(...)`, `rgb(...)`.
- **`radius`** becomes `--radius`, the base for every corner.
- **`fonts`** becomes `--ripple-font-sans`, `--ripple-font-serif`, `--ripple-font-mono` and `--ripple-font-heading`.

The schema also accepts `mode` (`light`, `dark` or `system`) and `logo`, but the renderer doesn't apply either: dark mode comes from the `.dark` class, and a logo goes in the props of the widget that shows it.

The colour tokens a theme can set:

| Group | Tokens |
|---|---|
| Base | `background`, `foreground`, `border`, `input`, `ring` |
| Surfaces | `card`, `card-foreground`, `popover`, `popover-foreground` |
| Actions | `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `accent`, `accent-foreground`, `destructive`, `destructive-foreground` |
| Quiet | `muted`, `muted-foreground` |
| Charts | `chart-1` to `chart-5` |
| Sidebar | `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring` |

To produce the same variables yourself, for example on a server-rendered wrapper, use `themeToCssVars(theme)` or `themeToStyleString(theme)` from `@ripple-ui/svelte`.

## 3. A brand pack

When the same look applies to many specs, keep it out of the specs and pass a brand pack to the component:

```svelte
<script lang="ts">
  import { Ripple } from '@ripple-ui/svelte';
  import type { BrandPack } from '@ripple-ui/core';

  const brand: BrandPack = {
    id: 'northwind',
    name: 'Northwind',
    version: '1.0.0',
    tokens: {
      color: {
        primary: { light: '#1d4ed8', dark: '#60a5fa' },
        surface: { light: '#ffffff', dark: '#0f172a' }
      },
      typography: { fontFamily: { sans: 'Inter, sans-serif' } },
      radius: { md: '10px' }
    }
  };

  let { spec, dark = false } = $props();
</script>

<Ripple {spec} {brand} brandMode={dark ? 'dark' : 'light'} />
```

Colour roles are camelCase (`primary`, `primaryForeground`, `surface`, `surfaceForeground`, `muted`, `border`, `ring`, `destructive`, `success`, `warning`, `info` and their foregrounds). Each sets both the shadcn variable and its `--ripple-*` counterpart. Inline variables can't react to a `.dark` class, so tell the component which slot to use with `brandMode`. `parseBrandPack` and `safeParseBrandPack` from `@ripple-ui/core` validate a pack loaded from JSON.

## How they stack

On the render's root, later wins:

1. Your app's CSS
2. The `style` prop on `<Ripple>`
3. The brand pack
4. The spec's `theme`

A prop set on an individual widget, such as a `color` on `text`, still wins over all of them for that widget.
