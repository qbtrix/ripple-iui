<!--
  Button.svelte — Ripple button widget.
  origin: slev12397/beautiful-ui@ff0f74d components/atoms/Button.tsx

  Updated 2026-09-14 (beautiful-ui re-skin, lane A). The button is now a PILL —
  the source's core button shape — instead of a rounded rectangle, with the
  source's per-size rhythm: roomier symmetric side padding, and a gap that
  steps with the size (sm 1 / md 1.5 / lg 2) rather than one gap for all. Type
  was already on the source's 12px/13px/14px medium ladder, so it is unchanged.
  Colour transitions now ride var(--ripple-ease-out), the skin's signature
  curve. The dead Tailwind `transition-[…] ease-out` class came off the base:
  the scoped .ripple-btn shorthand below overrides it, so it described nothing.

  NOT taken from the source: its `filledShadow`
  (inset 0 1px 0 rgba(255,255,255,0.14)) and the `shadow-btn` on secondary —
  every box-shadow stack is dropped this arc, and the faint gradient face below
  already does that job without one. Its variant palette is dropped too: it is
  built on --ink/--canvas grounds the host owns. Variant and size NAMES, props,
  events and defaults are all unchanged.

  SPRING PRESS (kept, deliberately): on :active the button compresses to
  scale(0.965) and settles with a spring bounce-back. The physics come from
  resolvePreset('snappy')/('bouncy') -> springToCssTiming paired with
  FF_SPRING_TOKENS durations (80ms compress / 160ms release), so the press
  matches every other ripple spring. This is not decoration the skin may
  replace — Button.test.ts asserts the injected press custom properties and
  their 80ms/160ms values, and that test is the contract. The source's flat
  `active:scale-[0.96] duration-150` would be a strictly worse press anyway.
  Reduced motion: the scoped @media block drops the transform and collapses the
  transition, matching reduce-motion.ts. No $state rune is used for the press —
  :active + CSS carries it, so there is no vitest "$state is not a function"
  surface.

  GHOST (special): transparent by default with a subtle hover bg so it reads as
  a control, not naked text. When pressed/selected it "lights up" — label and
  icons take the accent colour with no fill. Driven by data-active below.

  Colors stay token-driven (bg-primary / bg-destructive / --primary etc.).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { tv } from 'tailwind-variants';
  import { Loader2 } from '@lucide/svelte';
  import { cn } from '$lib/utils.js';
  import { FF_SPRING_TOKENS, resolvePreset, springToCssTiming } from '$lib/motion/presets.js';
  import type { ResolvedPhysics } from '$lib/motion/presets.js';

  // 'snappy' and 'bouncy' always resolve to spring physics; narrow the union so
  // springToCssTiming (which expects a spring shape) type-checks — same narrowing
  // with-motion.ts does at runtime via a `type === 'spring'` guard.
  type SpringPhysics = Extract<ResolvedPhysics, { type: 'spring' }>;

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    children?: Snippet;
    hasChildren?: boolean;
    leading?: Snippet;
    trailing?: Snippet;
    variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
    /** Toggle/selected state. Drives ghost's "lights up in the accent" active look
     *  and is reflected to aria-pressed. Leave undefined for a plain button. */
    pressed?: boolean;
    form?: string;
    name?: string;
    value?: string;
    'aria-label'?: string;
    onclick?: (e?: MouseEvent) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    children,
    hasChildren = false,
    leading,
    trailing,
    variant = 'default',
    size = 'md',
    type = 'button',
    disabled = false,
    loading = false,
    pressed,
    form,
    name,
    value,
    'aria-label': ariaLabel,
    onclick,
  }: Props = $props();

  // ── SPRING TIMING — reuse ripple's motion primitive for the press ────────────
  // The press is a tap gesture: tap: { scale: 0.965 } with a spring. Rather than
  // hand-roll a cubic-bezier, we pull the PHYSICS from the same primitives every
  // other ripple animation uses, so the press feels consistent app-wide:
  //   • EASING comes from springToCssTiming(resolvePreset(<preset>)) — the exact
  //     spring→CSS overshoot cubic-bezier the motion runtime emits for a spring
  //     preset (the "kiss past then settle" curve).
  //   • DURATION comes from FF_SPRING_TOKENS — the FF-restrained authored timings.
  //     springToCssTiming's 220ms floor is right for an ENTRANCE but too slow for a
  //     tactile press, so we keep its EASING and swap in the FF token's short
  //     duration (the sub-100ms snap that reads "Apple-level"), the same split
  //     CheckboxGroup uses via ffTokenToCssTiming.
  //
  // COMPRESS (pointer down): snappy spring easing + FF `fast` (80ms) — instant, firm.
  // RELEASE  (pointer up):   bouncy spring easing + FF `moderate` (160ms) — springs
  //   back past rest then settles, the signature bounce-back.
  // Module-constant strings (no $state) so there is no runes/vitest surface.
  const COMPRESS_EASING = springToCssTiming(resolvePreset('snappy') as SpringPhysics).easing; // overshoot, restrained
  const RELEASE_EASING = springToCssTiming(resolvePreset('bouncy') as SpringPhysics).easing; // overshoot, playful
  const COMPRESS_MS = Math.round(FF_SPRING_TOKENS.fast.duration * 1000); // 80
  const RELEASE_MS = Math.round(FF_SPRING_TOKENS.moderate.duration * 1000); // 160

  const button = tv({
    base: [
      // box-border makes height immutable: any per-spec padding/border lives
      // INSIDE the fixed size height, so every variant of a given size is the
      // SAME height (canonical) regardless of border/padding/consumer preflight.
      'ripple-btn box-border relative isolate inline-flex items-center justify-center whitespace-nowrap select-none cursor-pointer',
      // Pill — the source's core button shape.
      'rounded-full font-medium tracking-[-0.01em] leading-none',
      // Transitions are owned entirely by the scoped .ripple-btn block below:
      // its shorthand overrides any Tailwind transition-* class set here, so a
      // class here would only describe something that never applies. Colour
      // rides a 150ms tween on the skin's ease; the TRANSFORM (press) rides the
      // spring vars set per-state.
      // Theme-driven focus ring, offset so it reads on any surface.
      'outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      // Disabled: quiet, flat, non-interactive — no lingering depth.
      'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
    ],
    variants: {
      variant: {
        // Solid keys: layered depth via the scoped .ripple-solid rule (gradient
        // overlay + inset top highlight + outer shadow). Token bg drives the hue.
        default:
          'ripple-solid bg-primary text-primary-foreground hover:bg-primary/95',
        primary:
          'ripple-solid bg-primary text-primary-foreground hover:bg-primary/95',
        destructive:
          'ripple-solid bg-destructive text-destructive-foreground hover:bg-destructive/95',
        // Secondary: a real filled neutral key with a softer edge + shadow.
        secondary:
          'ripple-raised bg-secondary text-secondary-foreground hover:bg-secondary/80',
        // Outline: bordered surface that lifts on hover.
        outline:
          'ripple-raised border border-border bg-background text-foreground hover:bg-muted hover:border-border/80',
        // Ghost: transparent control with a quiet hover bg; lights up in the
        // accent when active (.ripple-ghost + data-active handle the accent text).
        ghost:
          'ripple-ghost bg-transparent text-foreground hover:bg-muted',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline px-0 h-auto',
      },
      // The source's pill rhythm: roomier sides than a rounded rectangle needs
      // (round caps eat visual space), and a gap that steps with the size.
      size: {
        sm: 'h-7 px-3 text-[12px] gap-1',
        md: 'h-8 px-4 text-[13px] gap-1.5',
        lg: 'h-10 px-5 text-sm gap-2',
        icon: 'h-8 w-8 p-0 gap-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  });

  const isDisabled = $derived(disabled || loading);
  const state = $derived(loading ? 'loading' : disabled ? 'disabled' : 'idle');
  // Ghost "lit" look: explicitly pressed/selected. link never lights up.
  const isActive = $derived(pressed === true && variant !== 'link');

  // Press spring CSS custom properties — injected so the scoped style can read the
  // primitive-derived timing without templating CSS strings into a stylesheet.
  const pressVars = $derived(
    [
      `--ripple-press-compress:${COMPRESS_MS}ms ${COMPRESS_EASING}`,
      `--ripple-press-release:${RELEASE_MS}ms ${RELEASE_EASING}`,
    ].join(';'),
  );

  const styleString = $derived(
    (style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') + ';' : '') + pressVars,
  );

  const iconSize = $derived(size === 'sm' ? 14 : size === 'lg' ? 18 : 16);

  function handleClick(e: MouseEvent) {
    if (isDisabled) return;
    onclick?.(e);
  }
</script>

<button
  {id}
  {type}
  {form}
  {name}
  {value}
  class={cn(button({ variant, size }), className)}
  style={styleString}
  data-variant={variant}
  data-size={size}
  data-state={state}
  data-active={isActive ? 'true' : undefined}
  disabled={isDisabled}
  aria-busy={loading ? 'true' : undefined}
  aria-pressed={pressed === undefined ? undefined : pressed ? 'true' : 'false'}
  aria-label={ariaLabel}
  onclick={handleClick}
>
  {#if loading}
    <span data-slot="button-spinner" class="inline-flex shrink-0">
      <Loader2 size={iconSize} class="animate-spin" />
    </span>
  {:else if leading}
    <span data-slot="button-leading" class="inline-flex shrink-0">{@render leading()}</span>
  {/if}

  {#if children}
    {@render children()}
  {:else if label}
    <span data-slot="button-label">{label}</span>
  {/if}

  {#if !loading && trailing}
    <span data-slot="button-trailing" class="inline-flex shrink-0">{@render trailing()}</span>
  {/if}
</button>

<style>
  /* ── Fluid Functionalism depth + spring press ──────────────────────────────
     Scoped so it can't leak. Colors stay token-driven; the ONLY hardcoded color
     is the white inset top-edge highlight (a light overlay, not a theme hue). */

  .ripple-btn {
    /* Will-change the transform only while interactive; keeps the press composited. */
    transform: translateZ(0);
    /* RELEASE is the resting transition: when :active is removed the button
       springs back along the bouncy overshoot curve. Falls back to a sane spring
       if the custom prop is somehow absent. */
    transition:
      transform var(--ripple-press-release, 160ms cubic-bezier(0.34, 1.66, 0.4, 1)),
      background-color 150ms var(--ripple-ease-out),
      box-shadow 150ms var(--ripple-ease-out),
      border-color 150ms var(--ripple-ease-out),
      color 150ms var(--ripple-ease-out);
  }

  /* The signature press: compress + settle on a snappy spring. On pointer down
     the COMPRESS transition takes over (faster, firmer); releasing falls back to
     the resting RELEASE transition above (the bounce-back). */
  .ripple-btn:active:not(:disabled) {
    transform: scale(0.965) translateZ(0);
    transition:
      transform var(--ripple-press-compress, 80ms cubic-bezier(0.34, 1.39, 0.4, 1)),
      background-color 150ms var(--ripple-ease-out),
      box-shadow 150ms var(--ripple-ease-out);
  }
  /* link is text, not a physical key — it shouldn't compress. */
  .ripple-btn[data-variant='link']:active {
    transform: none;
  }

  /* ── Solid keys: flat fill + a barely-there gradient face (NO shadows) ──────
     Captain wants flat buttons — all box-shadows removed. A faint top→base
     gradient keeps a hint of dimension without any drop/inset shadow. The
     tactile feel comes purely from the spring press (scale). */
  .ripple-solid {
    background-image: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.06),
      rgba(255, 255, 255, 0) 60%
    );
  }
  .ripple-solid:active:not(:disabled) {
    /* Pressed: face dims slightly (no shadow) — paired with the scale press. */
    background-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.05),
      rgba(0, 0, 0, 0) 60%
    );
  }

  /* ── Raised keys (secondary / outline): flat, no shadow (border/fill carry) ── */

  /* ── Ghost: quiet control that lights up in the accent when active ──────────
     No fill in either state. When pressed/selected (data-active) OR held down
     (:active), the label + icons take the primary accent color. */
  .ripple-ghost[data-active='true'],
  .ripple-ghost:active:not(:disabled) {
    color: var(--primary);
    background-color: transparent;
  }
  /* Icons inherit currentColor, so the leading/trailing slots light up too. */

  /* ── Reduced motion: honor the same policy as the motion runtime ────────────
     Drop the press transform + collapse the transition to a near-instant fade of
     color/shadow only. Mirrors reduce-motion.ts (movement dropped). */
  @media (prefers-reduced-motion: reduce) {
    .ripple-btn,
    .ripple-btn:active:not(:disabled) {
      transform: none;
      transition:
        background-color 100ms ease,
        box-shadow 100ms ease,
        color 100ms ease;
    }
  }
</style>
