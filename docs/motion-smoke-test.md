<!--
  docs/motion-smoke-test.md
  Created: 2026-05-30 (PR #45 motion-wrapper box fix). A short manual smoke
  test for the RFC-12 motion primitive, written to catch the failure class
  where unit tests are green but nothing animates on screen — exactly the
  `display: contents` wrapper bug this guide was born from.
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
| `/showcase/motion` | The "Describe → Generate → Refine → Ship" cards **fade + rise in sequence** as they scroll into view. The CTA button **scales/springs on hover and tap**. The `reveal` and `parallax` sugar panels move on scroll. |
| `/showcase/marketing` | Section/hero blocks **animate in on scroll**; hover states on cards/buttons respond. |
| `/showcase/premium` | Premium widgets (bento, text effects) **animate**, not snap. |

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

## Quick DOM-level confirmation (no browser)

The repo ships no Playwright, so unit tests cannot repaint pixels. The strongest
non-browser proof lives in
`src/lib/components/NodeRenderer.motion.animates.test.ts`: it renders a motion
spec through `NodeRenderer`, asserts the wrapper is a box (`display !==
'contents'`), then dispatches a real `mouseenter` and asserts the inline
`transform` actually mutates to the hover frame. That catches the wrapper-box
bug. Full visual confirmation (a browser computing the transform and
repainting) still needs the eyes-on pass above.
