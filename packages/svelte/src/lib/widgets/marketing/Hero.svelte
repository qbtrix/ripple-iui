<!--
  @file widgets/marketing/Hero.svelte
  @description Bespoke MARKETING hero — the visual centerpiece of the landing
    pack (type `marketing-hero`). Distinct from the borrowed layout/Hero (plain
    centered headline): this is an ASYMMETRIC editorial hero. Copy block (eyebrow
    pill, large tight-tracked headline, subtitle, primary + optional secondary
    CTA) sits on the left; a self-contained, hand-built CSS "canvas" panel sits
    on the right (layered dot-grid texture + a soft drifting radial/conic glow +
    a floating spec chip). Collapses to a single stacked column below lg.

  STATIC-SAFETY (non-negotiable — renders prerendered, JS OFF):
    - No onMount, no JS engine, no client-only primitives. The full resting state
      is baked into markup.
    - The only motion is a slow CSS @keyframes glow drift on the visual panel;
      it is purely declarative (runs without hydration, like premium/Aurora) and
      is disabled under prefers-reduced-motion. With JS off the panel still reads
      as a finished, composed visual — animation is enhancement, not structure.
    - All colors are token-driven (bg-primary / --primary / border / muted etc.)
      so the host theme controls the palette; no hardcoded "AI" accent.

  CONTRACT (props the pocketpaw assembler wires):
    eyebrow?, title (required), subtitle?, cta?, ctaHref?,
    secondaryCta?, secondaryCtaHref?,
    visual? = 'grid' | 'glow' | 'plain' (default 'grid'),
    align? = 'left' | 'center' (default 'left').
  @created 2026-06-09 — ITEM 4: bespoke marketing Hero.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Small label above the headline (rendered as a bordered pill). */
    eyebrow?: string;
    /** The headline. Required. */
    title: string;
    /** Supporting line under the headline. */
    subtitle?: string;
    /** Primary CTA label. Rendered only when set. */
    cta?: string;
    /** Primary CTA destination. */
    ctaHref?: string;
    /** Optional secondary (ghost) CTA label. */
    secondaryCta?: string;
    /** Secondary CTA destination. */
    secondaryCtaHref?: string;
    /**
     * Visual treatment of the right-hand panel:
     *  - 'grid'  : dot-grid texture + drifting glow + floating spec chip (default)
     *  - 'glow'  : drifting glow only (no grid, no chip) — softer
     *  - 'plain' : single-column, no visual panel (copy centered)
     */
    visual?: 'grid' | 'glow' | 'plain';
    /** Copy alignment. 'left' (default) or 'center'. Forced center when visual='plain'. */
    align?: 'left' | 'center';
  }
  let {
    id, class: className, style,
    eyebrow, title, subtitle,
    cta, ctaHref = '#',
    secondaryCta, secondaryCtaHref = '#',
    visual = 'grid', align = 'left',
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // 'plain' has no visual panel, so the copy always centers.
  const centered = $derived(align === 'center' || visual === 'plain');
  const split = $derived(visual !== 'plain');
</script>

<section
  {id}
  class={cn(
    'ripple-mhero relative w-full overflow-hidden rounded-2xl border border-border bg-card text-card-foreground',
    'px-6 py-14 md:px-10 md:py-20',
    className
  )}
  style={styleString}
>
  <div
    class={cn(
      'relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10',
      split && 'lg:grid-cols-2 lg:gap-16'
    )}
  >
    <!-- Copy block -->
    <div class={cn('flex flex-col gap-5', centered && 'items-center text-center')}>
      {#if eyebrow}
        <span
          class="inline-flex w-fit items-center rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground backdrop-blur"
        >{eyebrow}</span>
      {/if}
      <h1
        class={cn(
          'text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl',
          centered && 'max-w-3xl'
        )}
      >{title}</h1>
      {#if subtitle}
        <p
          class={cn(
            'text-base leading-relaxed text-muted-foreground md:text-lg',
            centered ? 'max-w-xl' : 'max-w-md'
          )}
        >{subtitle}</p>
      {/if}
      {#if cta || secondaryCta}
        <div class={cn('mt-2 flex flex-wrap gap-3', centered && 'justify-center')}>
          {#if cta}
            <a
              href={ctaHref}
              class="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >{cta}</a>
          {/if}
          {#if secondaryCta}
            <a
              href={secondaryCtaHref}
              class="inline-flex items-center rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >{secondaryCta}</a>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Bespoke visual panel (omitted entirely when visual='plain') -->
    {#if split}
      <div
        class={cn(
          'ripple-mhero-panel relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-background',
          visual === 'grid' && 'ripple-mhero-grid'
        )}
        aria-hidden="true"
      >
        <!-- drifting glow (CSS keyframes; reduced-motion disables it) -->
        <div class="ripple-mhero-glow pointer-events-none absolute inset-0"></div>
        {#if visual === 'grid'}
          <!-- floating spec chip — gives the panel a product/composed feel -->
          <div
            class="absolute bottom-5 left-5 right-5 rounded-lg border border-border bg-card/80 p-4 shadow-lg backdrop-blur"
          >
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-primary"></span>
              <span class="h-2 w-16 rounded-full bg-foreground/70"></span>
              <span class="ml-auto h-2 w-8 rounded-full bg-muted-foreground/40"></span>
            </div>
            <div class="mt-3 space-y-2">
              <span class="block h-2 w-full rounded-full bg-muted-foreground/25"></span>
              <span class="block h-2 w-4/5 rounded-full bg-muted-foreground/20"></span>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  /* Dot-grid texture for the 'grid' visual — pure CSS background, baked in markup. */
  .ripple-mhero-grid {
    background-image: radial-gradient(
      circle,
      color-mix(in oklab, var(--foreground) 12%, transparent) 1px,
      transparent 1px
    );
    background-size: 22px 22px;
  }

  /* Soft layered glow that slowly drifts. Declarative CSS animation: it runs
     without JS (like premium/Aurora) and the resting frame is already a
     finished gradient, so JS-off prerender looks complete. */
  .ripple-mhero-glow {
    background:
      radial-gradient(60% 60% at 30% 25%, color-mix(in oklab, var(--primary) 45%, transparent) 0%, transparent 60%),
      radial-gradient(50% 50% at 80% 70%, color-mix(in oklab, var(--primary) 28%, transparent) 0%, transparent 60%);
    filter: blur(34px) saturate(1.15);
    opacity: 0.55;
    background-size: 180% 180%;
    animation: ripple-mhero-drift 16s ease-in-out infinite alternate;
  }
  @keyframes ripple-mhero-drift {
    from { background-position: 0% 50%, 100% 0%; }
    to { background-position: 100% 0%, 0% 100%; }
  }

  /* A faint top-edge sheen on the whole hero for depth (tinted, not a glow). */
  .ripple-mhero::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      color-mix(in oklab, var(--foreground) 4%, transparent) 0%,
      transparent 28%
    );
  }

  @media (prefers-reduced-motion: reduce) {
    .ripple-mhero-glow { animation: none; }
  }
</style>
