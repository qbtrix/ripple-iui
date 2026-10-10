---
title: Security and safe URLs
description: What Ripple does with URLs and styles that come from model output, and what your app still has to do.
order: 7
---

A spec is model output, and model output can be steered by whatever the model read: a web page, an email, a document a user pasted. Treat every spec as untrusted input. Ripple is built on that assumption, and this page lists what it checks and what it leaves to you.

## What a spec can't do

- **Run code.** Expressions are a small grammar with no functions, loops or globals, and only a short list of methods runs (see [State and expressions](/docs/concepts/state-and-expressions)).
- **Render arbitrary markup.** Every node is a registered widget. An unknown `type` renders as a visible error box, not as HTML.
- **Make requests or navigate.** `api`, `navigate`, `run_source`, `call_binding` and `invoke_tool` only send an event to your `onEvent` handler. Nothing happens unless your code does it.

## URLs

An expression can assemble a dangerous URL while the spec renders, for example `"{'java' + 'script:alert(1)'}"` or `"{state.a}:alert(1)"`. So Ripple checks URLs on the final, resolved value, at the place it is used, with one function: `safeUrl` from `@ripple-ui/core`.

It has two modes:

| Mode | Used for | Allowed | Anything else becomes |
|---|---|---|---|
| `link` (default) | `href`, form `action`, `window.open`, the `navigate` action | Relative paths (`/x`, `./x`, `?q`, `#h`, `//host`), `http`, `https`, `mailto`, `tel` | `undefined` |
| `resource` | `src`, `poster`, CSS `url()` | Relative paths except `//host`, `http`, `https`, and `data:image/` in PNG, GIF, JPEG or WebP | `undefined`, so the attribute is dropped |

```ts
import { safeUrl } from '@ripple-ui/core';

safeUrl('https://example.com');                 // 'https://example.com'
safeUrl('javascript:alert(1)');                 // undefined
safeUrl('java&#x61;script:alert(1)');           // undefined
safeUrl('data:image/svg+xml,...', { kind: 'resource' });  // undefined
safeUrl('');                                     // undefined
```

Before it looks at the scheme, `safeUrl` decodes HTML entities and percent-escapes once and removes whitespace and control characters, so `java&#x61;script:` and `java\tscript:` are caught. The value it returns is the trimmed input itself, so what was checked is what renders. Protocol-relative URLs (`//host`) are refused as resources because on a `file:` page they read local files. SVG data URLs are refused because SVG can carry script.

Every built-in widget passes its URLs through `safeUrl`, and so does the `navigate` action: a refused `navigate` reaches your handler with an empty `url`. A refused link is dropped, so the element renders without an `href`.

## Styles

A node's `style` record goes through `safeStyle` after its expressions resolve. It drops any declaration that:

- has a `url()` or `image-set()` target that fails `safeUrl(..., { kind: 'resource' })`;
- contains `expression(`, `-moz-binding`, `behavior:`, `javascript:` or `vbscript:`;
- has a property name that isn't a plain CSS identifier, so a key like `color:red;background` can't inject a second declaration.

## Embedded content

The `embed` widget shows a remote page or an inline document in a sandboxed iframe. The renderer sets the sandbox and a spec can't widen it. `allow-same-origin` is never granted, so the frame runs at an opaque origin and can't read your cookies, storage or backend. Remote URLs must be `https`. The `allow` list accepts only `fullscreen`, `autoplay`, `encrypted-media` and `picture-in-picture`.

## Model-drawn SVG

The `illustration` widget takes SVG markup the model writes, and never renders that string. It parses it with `DOMParser` and rebuilds a copy with `createElementNS`, keeping only what an allowlist names and silently dropping the rest.

- **Elements:** `svg g defs title desc path rect circle ellipse line polyline polygon text tspan linearGradient radialGradient stop clipPath mask symbol use animate animateTransform animateMotion mpath set`. No filters, `<image>`, `<style>`, `<a>`, `<foreignObject>` or scripts.
- **References:** only `url(#id)`, and `href='#id'` on `use` and `mpath`. No `style` attribute and no `on*` handlers. Animations may only target presentation attributes such as `fill`, `opacity`, `transform`, `cx` and `d`.
- **Caps:** 24,000 characters, 400 elements, depth 24, 40 animation elements, every `dur` at least 0.5s, `repeatCount` at most 1000 or `indefinite`, at most 40 `use` elements, and no `use` that points at another `use` or at a group holding one. Past a cap, or while the markup is still streaming in, the widget shows a quiet placeholder.
- **Ids** are prefixed per instance, along with every `url(#..)`, `href` and `begin`/`end` that points at them, so two cards on one page never collide.
- **Text stays readable.** A `text` or `tspan` fill under 3:1 contrast against what it sits on is swapped for the card's text or background colour. `currentColor` and `url(#..)` fills are never changed.

To refuse a card instead of rendering a cleaned copy, call `checkIllustrationSvg(markup)` from `@ripple-ui/svelte`. The lists it checks against are data in `@ripple-ui/core/manifest` (`ILLUSTRATION_*`).

## Your own widgets and renderers

The checks above cover the built-in widgets. If you write a [custom widget](/docs/guides/custom-widgets), pass every URL prop through `safeUrl` where you use it, and any style string you build through `safeStyle`. If you render the [headless tree](/docs/concepts/headless) with another framework, resolved props reach you unfiltered, so do the same there.

## What your app still has to do

- **Check every event before acting on it.** For `navigate`, ignore an empty `url` and decide which destinations are allowed. For `api`, only call endpoints you expect, and don't forward `headers` from a spec to another origin.
- **Authorize on the server.** For `run_source`, `call_binding` and `invoke_tool`, look up the name in an allowlist for the current user and reject anything else with `{ ok: false, error: { message, status: 403 } }`. The browser can't be trusted to have checked.
- **Keep secrets out of state.** Anything in `state` or `data` can be read by an expression and sent in an `emit` or `api` event. Don't put tokens there.
- **Set a Content Security Policy.** A CSP without `unsafe-inline` scripts, and with `frame-src` limited to origins you trust for `embed`, limits the damage if anything slips through.
- **Validate before you render** when a spec comes from somewhere you don't control. See [Catalog and validation](/docs/concepts/catalog-and-validation).
- **Keep model keys on the server.** Call the model from an endpoint and stream the text to the page. The model guides ([Claude](/docs/guides/claude-api), [OpenAI](/docs/guides/openai), [any model](/docs/guides/any-model)) all work that way.
