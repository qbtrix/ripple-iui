<!--
  docs/motion-smoke-test.md
  Created: 2026-05-30 (PR #45 motion-wrapper box fix). A short manual smoke
  test for the RFC-12 motion primitive, written to catch the failure class
  where unit tests are green but nothing animates on screen — exactly the
  `display: contents` wrapper bug this guide was born from.
  Changes:
    - 2026-05-30 (PR #45 motion runtime close-out): documented the now-working
      staggered cascade (inView full from-state + per-card transition.delay in
      SECONDS), the motion.scroll parallax runtime, the opt-in debug flag
      (window.__RIPPLE_MOTION_DEBUG__), and the remaining motion.stagger gap.
-->

# Motion smoke test (catch "green tests, no visible animation")

Motion has a failure mode unit tests miss: the action runs, writes
`transform` / `opacity` / `filter`, every test passes — and the page does not
move a pixel. It happened once already: the node-level motion wrapper was
`display: contents`, which generates **no box**, so the styles the action wrote
had nowhere to paint. jsdom never renders, so the suite stayed green.

This is a 2-minute eyes-on check. Run it after any change to the motion engine,
the `withMotion` action, the `NodeRenderer` motion wrapper, or the sugar widgets
(`Reveal`, `Parallax`).

## Before you start

1. **Turn reduced-motion OFF.** If your OS has "Reduce motion" enabled, the
   action intentionally strips transforms (cross-fade only) and you will wrongly
   conclude motion is broken.
   - macOS: System Settings → Accessibility → Display → **Reduce motion** = off.
   - Chrome DevTools can also force it: Rendering panel → "Emulate CSS
     media feature prefers-reduced-motion" → set to **no-preference**.
2. Start the dev server: `bun run dev`.

## The three showcase routes

Open each and watch:

| Route | What must visibly happen |
|-------|--------------------------|
| `/showcase/motion` | The "Describe → Generate → Refine → Ship" cards **fade AND rise in sequence** (each card both drops its opacity-0 and slides up from +28px) as they scroll into view, **cascading** one after another (~120ms apart). The CTA button **scales/springs on hover and tap**. The `reveal` panels slide in on scroll; the `parallax` panel **drifts vertically as you scroll**. |
| `/showcase/marketing` | Section/hero blocks **animate in on scroll**; hover states on cards/buttons respond. |
| `/showcase/premium` | Premium widgets (bento, text effects) **animate**, not snap. |

### What "working" looks like on `/showcase/motion` (the runtime close-out)

These three were deferred in the first cut of `withMotion` and are now live. If
any of them does NOT happen, motion regressed:

1. **Staggered cards fade AND rise** — not just fade. Each card arms its full
   inView "from" frame (`opacity:0` + `translateY(28px)`), so it both fades in
   and slides up. A card that only changes opacity means the inView from-state
   regressed to opacity-only.
2. **The cards cascade** — they enter one after another, not all at once. The
   cascade is a per-card `transition.delay`. **The delay unit is SECONDS**
   (Framer-style): the showcase authors `delay: i * 0.12`, so the four cards are
   offset 0 / 120 / 240 / 360 ms. If they all enter simultaneously, the delay is
   not being wired into `transition-delay`.
3. **The parallax panel drifts on scroll** — the `parallax` sugar (a
   `motion.scroll`) binds vertical translate to the element's view progress.
   Where the browser supports `animation-timeline: view()` it runs as a
   compositor-driven CSS animation; otherwise it falls back to an
   IntersectionObserver + scroll-rAF loop. A static panel means `motion.scroll`
   is inert.

### Trigger the motion

- **Scroll** the page so motion sections cross into the viewport — `inView` /
  reveal / stagger fire on intersection, not on load. If you sit at the top, you
  see nothing; that is expected, not a bug.
- **Hover** the interactive cards and CTA — `hover` frames apply on
  `mouseenter`, clear on `mouseleave`.
- **Press** (click-and-hold) the CTA — `tap` frames apply on `pointerdown`.
- **Tab** to a focusable motion target — `focus` frames apply on `focusin`.

### Check the browser console

Keep DevTools open. The page must load with **no red errors** and **no Vite
error overlay**. A JS engine import that leaked to module top level (motion.dev /
gsap) throws on the workerd SSR pass and kills the render — `bun run lint:anim`
guards this, but the console is the visual backstop.

### Opt-in debug logging

`withMotion` has an opt-in trace that is **off by default**. Turn it on to see
exactly what the action does to each motion node — useful when "nothing moves"
and you need to know whether the action attached, whether the
IntersectionObserver fired, and whether the reveal/scroll wiring ran.

Enable it **before the page loads** (the action reads the flag as each node
mounts):

```js
// In the DevTools console, BEFORE navigating / on first load:
window.__RIPPLE_MOTION_DEBUG__ = true;
// then reload the route.
```

You will see `console.debug` lines tagged `[ripple-motion]` at each lifecycle
point, with the motion config attached:

- `action attached` (+ the resolved motion config)
- `enter run`
- `inView armed` (+ the from-state)
- `IntersectionObserver fired` (+ `isIntersecting`)
- `reveal applied`
- `scroll wired` (+ `{ mode: 'css' | 'fallback', ...scroll }`)

If you set the flag and see **no `action attached` line** for an element you
expect to animate, the action never reached it — check that the node carries a
`motion` field (or is a `reveal` / `parallax` sugar widget) and that the wrapper
is a real box (see the `display: contents` section below). If you see
`action attached` but no `IntersectionObserver fired` on scroll, the element is
not crossing its intersection threshold — scroll further or check `amount`.

To turn it back off: `delete window.__RIPPLE_MOTION_DEBUG__` (or set it falsy)
and reload. Logging uses `console.debug`, so it also respects the DevTools
"Verbose" log-level filter.

## The `display: contents` pitfall (the bug this guide is named after)

If a motion element runs its action but **does not move**, inspect it in
DevTools and check its `display`:

- A motion target **must be a layout box** — `block`, `inline-block`, `flex`,
  `grid`, etc. `transform` / `opacity` on a real box paint.
- **`display: contents` has no box.** The element contributes its children to
  the layout but generates no box of its own, so any `transform` / `opacity` /
  `filter` you set on it is silently ignored. The styles are in the DOM; nothing
  renders.

How to spot it fast:

1. In the Elements panel, select the `[data-ripple-motion]` wrapper.
2. In Computed styles, read `display`. If it is `contents`, that is the bug.
3. The fix is to give the wrapper a real box. The node-level wrapper in
   `NodeRenderer.svelte` uses `class="block"`; the `Reveal` / `Parallax` sugar
   widgets use `cn('block', …)`. Match that.

**Caveat:** a block wrapper around an intrinsically inline widget changes its
inline flow. That is the right default for the marketing/premium widgets (they
are block-level sections, cards, buttons). For a genuinely inline motion target,
prefer a sugar widget or supply an explicit display override.

## Known gap: parent-orchestrated `motion.stagger`

The schema has a `motion.stagger` field (a parent node orchestrating an `each`-ms
offset across its children, ordered `first` / `last` / `center`). The runtime
does **not** implement it yet — applying it cleanly needs cross-action
coordination (the parent injecting an ordered offset into each child's reveal,
which each child applies through its own `withMotion`). It is **not** on the
critical path: the `/showcase/motion` cascade is built from per-card
`transition.delay` (see the cascade behavior above), not the `stagger` field. If
you author `motion.stagger` today it is silently ignored — use per-child
`transition.delay` instead. Implementing parent stagger is a follow-up.

## Quick DOM-level confirmation (no browser)

The repo ships no Playwright, so unit tests cannot repaint pixels. The strongest
non-browser proofs live in
`src/lib/components/NodeRenderer.motion.animates.test.ts`:

- It renders a motion spec through `NodeRenderer`, asserts the wrapper is a box
  (`display !== 'contents'`), then dispatches a real `mouseenter` and asserts the
  inline `transform` actually mutates to the hover frame — catching the
  wrapper-box bug.
- The **staggered-card proof** renders a card authored exactly like the
  `/showcase/motion` row (inView `{opacity:0, y:28}` + `transition.delay: 0.24`)
  and asserts the wrapper carries BOTH the initial `translateY(28px)` AND a
  `transition-delay` of `240ms` on reveal — the DOM-level proof that the fade +
  rise + cascade all wire through.

`src/lib/widgets/motion/sugar.test.ts` additionally asserts the `parallax` sugar
tags its wrapper as scroll-wired, proving `motion.scroll` is no longer inert.

Full visual confirmation (a browser computing the transform and repainting)
still needs the eyes-on pass above.
