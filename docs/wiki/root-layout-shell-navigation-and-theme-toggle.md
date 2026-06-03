---
{
  "title": "Root Layout — Shell, Navigation, and Theme Toggle",
  "summary": "The SvelteKit root layout component that wraps every page in a persistent navigation shell, injects global styles and the SVG favicon, and wires up a reactive dark-mode toggle that reads the OS preference on first load.",
  "concepts": [
    "SvelteKit layout",
    "dark mode",
    "theme toggle",
    "sticky navbar",
    "global styles",
    "SSR guard",
    "CSS custom properties",
    "favicon",
    "Svelte 5 runes",
    "prefers-color-scheme"
  ],
  "categories": [
    "layout",
    "routing",
    "theming"
  ],
  "source_docs": [
    "e9dfb911ac3002f2"
  ],
  "backlinks": null,
  "word_count": 399,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`routes/+layout.svelte` is the outermost shell for the Ripple showcase app. Every route renders inside it. It provides three things: a persistent top navigation bar, global CSS injection, and a live dark/light theme switch.

## Dark Mode Implementation

```svelte
let dark = $state(
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
);

$effect(() => {
  document.documentElement.classList.toggle('dark', dark);
});
```

The `typeof window !== 'undefined'` guard prevents SSR crashes — SvelteKit can render pages server-side where `window` does not exist. Without this guard, the initial state expression would throw a `ReferenceError` during server render and break the entire app.

The `$effect` then mirrors the boolean into a `dark` class on `<html>`, which is the CSS custom property pivot point. Downstream widgets that use `hsl(var(--background))` or similar tokens automatically inherit the correct palette without any additional wiring.

## Navigation Bar

The topbar is sticky (`position: sticky; top: 0; z-index: 50`) so it remains visible while scrolling through long showcase pages. It contains:

- **Logo** — a Ripple wordmark with a pill icon, linking back to `/`
- **Nav links** — Pockets (`/`) and Showcase (`/showcase`), styled as soft pill buttons with hover feedback
- **Theme toggle** — an icon-only button that swaps between sun and moon SVGs based on `dark` state

The toggle uses inline SVGs rather than an icon library import, keeping the layout dependency-free. The sun uses stroke-based rays; the moon uses the classic crescent path. Both are 16×16 and use `currentColor` for theme-aware stroke.

## Global Style Injection

```svelte
import '$lib/styles.css';
```

Placing the global stylesheet import here ensures it loads exactly once, regardless of how many routes are visited. If it were imported in individual page components, bundlers might duplicate it or apply it inconsistently across navigation transitions.

## Favicon

```svelte
import favicon from '$lib/assets/favicon.svg';
```

Importing the SVG through Vite gives it a content-hashed URL, which busts browser cache when the icon changes. A plain `href="/favicon.svg"` would serve a stale cached version after deploys.

## Slot Rendering

Child page content renders via `{@render children()}` — the Svelte 5 runes API for layout slot rendering. This replaces the Svelte 4 `<slot />` element.

## Known Gaps

The dark mode preference is not persisted to `localStorage`, so refreshing the page re-reads the OS setting and ignores any manual toggle the user applied. Navigation active states are not highlighted — both links render identically regardless of the current route.