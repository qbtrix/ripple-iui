---
title: Install
description: Add @ripple-ui/svelte to a Svelte 5 app and point Tailwind v4 at its widgets.
order: 1
---

Ripple renders a JSON UI spec as a live Svelte 5 interface. It ships as one package, `@ripple-ui/svelte`. The engine underneath, `@ripple-ui/core`, comes with it as a dependency, so you don't install it separately.

## Add the package

```bash
bun add @ripple-ui/svelte
```

npm, pnpm and yarn work the same way. The only peer dependency is Svelte 5 (`^5.0.0`).

## Set up Tailwind

The widgets are styled with Tailwind CSS v4 classes, so your app needs Tailwind v4 (for example through `@tailwindcss/vite`). Tailwind skips `node_modules` when it scans for classes, so add an `@source` line that points at the package's `dist`. The path is relative to the CSS file it sits in.

If your app has no design tokens of its own, import `styles.css`. It brings in Tailwind itself, default shadcn-style colour tokens (light, plus a `.dark` class) and Ripple's theme, so don't also `@import "tailwindcss"`:

```css
/* src/app.css */
@import "@ripple-ui/svelte/styles.css";
@source "../node_modules/@ripple-ui/svelte/dist";
```

If you already define shadcn tokens (`--background`, `--primary`, `--card` and the rest), as a shadcn-svelte app does, keep your sheet and add only the theme:

```css
@import "tailwindcss";
@import "@ripple-ui/svelte/theme.css";
@source "../node_modules/@ripple-ui/svelte/dist";
```

`theme.css` adds the `--ripple-*` tokens and their utilities (`bg-ripple-surface`, `rounded-ripple`), which default to your shadcn tokens. To restyle Ripple without touching your own tokens, override a `--ripple-*` property, scoped if you like:

```css
.my-panel .ripple-root {
  --ripple-surface: transparent;
}
```

## Dark mode and per-spec themes

Ripple follows the `.dark` class on an ancestor, the same convention shadcn uses. A spec can also carry its own theme, which applies to that render only:

```json
{
  "theme": {
    "colors": { "primary": "#3b82f6" },
    "radius": "0.5rem",
    "mode": "dark"
  }
}
```

`mode` takes `light`, `dark` or `system`. Colours accept hex, OKLCH or RGB strings.

## Check it works

Render a one-widget spec anywhere in a page:

```svelte
<script lang="ts">
  import { Ripple } from '@ripple-ui/svelte';
</script>

<Ripple spec={{ version: '1.0', ui: { type: 'text', props: { text: 'Ripple is installed.' } } }} />
```

If the text shows up unstyled, Tailwind isn't scanning the package. Check the `@source` path against where your CSS file lives.
