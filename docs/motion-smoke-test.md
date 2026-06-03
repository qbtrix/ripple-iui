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
    - 2026-05-30 (PR #45 parallax + animate close-out): added the AUTOMATED
      real-browser smoke-test (Playwright + Chromium) that is now the durable
      arbiter for this failure class; documented the now-working `animate` action
      runtime (it pulses a target by id with no host code) and corrected the
      parallax section (the scroll runtime is a robust IO/scroll-rAF loop — the
      inert CSS animation-timeline: view() path was removed).
    - 2026-05-30 (PR #45 degrade-to-visible fix): documented the core guarantee —
      "motion degrades to visible, never hidden" — and the spring-preset enter
      that exposed it (the invisible-hero bug on /showcase/marketing). Added the
      Playwright hero-visibility assertion and the jsdom degrade tests to the
      tripwire lists.
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

## The core guarantee: motion degrades to VISIBLE, never hidden

A motion can hide an element before it animates it in — an `enter` arms a
"from" frame (`opacity:0`, `translateY(24px)`) on hydrate, then reveals it to
rest. **The non-negotiable invariant: an entered element ALWAYS ends in its
resting (visible) state, no matter what.** If the reveal step ever fails to land,
the element is stranded hidden forever — SSR painted it, hydrate hid it, the
reveal never came. That is the worst failure this primitive can have: not "no
animation" but "no content."

This bit us once. The `/showcase/marketing` hero declares
`enter: { opacity: 0, y: 24 }` with the **`snappy` spring preset**. A spring
preset used to route the `enter` to Tier 1 (motion.dev), which was asked to
spring toward `{ opacity: 1, transform: 'none' }`. **motion.dev cannot
spring-interpolate the `transform:'none'` keyword** — it collapsed the box to
`matrix(0,0,0,0,0,0)`, so opacity reached 1 but the element became a zero-size,
invisible box and never recovered. The hero rendered as a tall empty gap.

How the runtime now guarantees visibility:

1. **`enter` runs on the reliable Tier-0 CSS transition by default** — even for
   a spring preset (its physics are approximated as a spring-like CSS easing).
   CSS interpolates `transform:'none'` cleanly and can never fail to load. A
   fade/rise entrance never needed a JS spring; the Tier-1/motion.dev path is
   reserved for things CSS genuinely can't do (gesture physics, scroll-linked).
2. **Belt-and-suspenders for any Tier-1 reveal** — `revealToRest` is the single
   canonical "land at rest" helper, and `safeTier1Reveal` lands that Tier-0
   reveal *first*, then layers motion.dev on top. If `loadAnimate()` resolves
   null, or `animate()` throws, or the promise rejects, the element is already
   visible. No reveal path ever `return`s leaving the node hidden.
3. **The opt-in Tier-1 enter** (`window.__RIPPLE_TIER1_ENTER__`, off by default)
   only ever runs through `safeTier1Reveal`, and animates per-channel rest
   (`x:0, y:0, scale:1`) — never the broken `transform:'none'` keyword.

The Playwright hero assertion (below) and the jsdom degrade tests in
`src/lib/actions/with-motion.test.ts` are the tripwires. If you change the enter
path, they must stay green.

## The automated real-browser smoke-test (Playwright) — run this first

The eyes-on pass below is still useful, but the durable arbiter is now an
automated Playwright suite that drives a **real Chromium** against the app and
asserts on **computed styles** — the only signal that reliably catches "green
unit tests, dead pixels." It lives in `e2e/motion.spec.ts` and covers the three
showcase motions: the staggered cascade, the parallax drift, and the `animate`
click.

```bash
# One-time: install the Chromium binary into the shared ms-playwright cache.
# (It is NOT vendored into the repo. The @playwright/test dep is already pinned.)
bunx playwright install chromium

# Run the browser smoke-test. The Playwright config boots the app for you via
# `vite build && vite preview` (a production build), so no separate server step.
bun run test:e2e
# …or directly:
bunx playwright test
```

What it asserts, per motion (these are the regression tripwires):

1. **Staggered cards** — scroll the row in; a card's computed `opacity` goes
   0 → 1 and its computed `transform` returns from `translateY(28px)` to rest.
2. **Parallax** — the parallax card's computed `transform` (translateY) **changes
   across scroll positions** (it must drift, not sit at `transform: none`).
3. **`animate`** — clicking "Fire animate action" **changes the target element's
   computed transform** (the pulse moves pixels).
4. **Marketing hero degrades to visible** — on `/showcase/marketing`, the hero
   (a `snappy` spring-preset `enter`) **ends computed `opacity` ~1 with its
   transform back at rest** and its title text visible. This is the
   invisible-hero tripwire: a stuck hero reports a collapsed transform / opacity
   that never recovers.

> **Why a production build, not the dev server?** We hit a dev-server-specific
> trap while fixing `animate`: after a deep edit to the dispatcher / NodeRenderer,
> Vite's HMR served a **stale client module graph** — the click was wired in fresh
> SSR but silently dead client-side, the same green-looks-wired/broken-in-browser
> failure this guide is about. `vite build` + `vite preview` is deterministic (no
> HMR) and is how the proof goes green. If you must point the suite at the dev
> server, do a hard reload and be suspicious of any "wired but inert" result.

If a Playwright assertion fails, the run drops a trace
(`test-results/.../trace.zip`); open it with `npx playwright show-trace <zip>` to
watch the exact frames. The `__RIPPLE_MOTION_DEBUG__` flag below also works under
Playwright (set it via an init script) to trace the action lifecycle.

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
| `/showcase/motion` | The "Describe → Generate → Refine → Ship" cards **fade AND rise in sequence** (each card both drops its opacity-0 and slides up from +28px) as they scroll into view, **cascading** one after another (~120ms apart). The CTA button **scales/springs on hover and tap**. The `reveal` panels slide in on scroll; the `parallax` panel **drifts vertically as you scroll**. Clicking **"Fire animate action"** makes the target card **pop (scale + lift, bouncy)** — the `animate` runtime pulses it by id with no host code. |
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
   `motion.scroll`) binds vertical translate to the element's view progress via
   an IntersectionObserver + scroll-rAF loop that writes `transform:
   translateY(...)` every frame. (An earlier cut tried a compositor-driven CSS
   `animation-timeline: view()` path, but it animated an *unregistered*
   `--ripple-scroll` custom property — which interpolates discretely per the CSS
   spec — so the card sat frozen at `transform: none`. That path was removed; the
   rAF loop is the single robust path now.) A static panel means `motion.scroll`
   regressed — the Playwright parallax assertion is the tripwire.

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
- `scroll wired` (+ `{ mode: 'raf', ...scroll }` — the robust scroll-rAF path)
- `playMotion: peak` (+ the chosen peak frame) — the `animate` runtime, logged
  when an `animate` action fires and pulses its target

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

## Quick DOM-level confirmation (jsdom — fast, but not pixels)

The Playwright suite above is the real pixel-level proof. These jsdom tests are
the fast inner-loop complement — they catch the wiring regressions without
booting a browser, but remember: **jsdom never repaints**, so a green jsdom run
is necessary, not sufficient. The strongest jsdom proofs live in
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
tags its wrapper scroll-wired (`data-ripple-scroll="raf"`), proving
`motion.scroll` is no longer inert.
`src/lib/core/event-dispatcher.animate.test.ts` asserts the `animate` runtime
finds a target node by id and pulses it (the inline transform mutates), and
`src/lib/actions/with-motion.test.ts` covers `playMotion` directly plus the
**degrade-to-visible** guarantee: a `snappy` spring-preset `enter` lands at rest
(`transform:none`, `opacity:''`) on the default Tier-0 path, and the opt-in
Tier-1 path still ends visible when `loadAnimate()` resolves null OR `animate()`
throws (both mocked). These are the unit-level tripwires for the invisible-hero
class — the Playwright hero assertion is the pixel-level one.

For the authoritative "does it actually paint" answer, run the Playwright suite
(`bun run test:e2e`) or do the eyes-on pass above.
