<!--
  @file widgets/premium/Shimmer.svelte
  @description A bright band sweeping through the text itself: the label is
    painted by a clipped gradient that runs muted → foreground → muted, and the
    gradient's position animates (Tier 0 — pure CSS, no JS engine, SSR-safe).
    Signals "the agent is working" on a label, a CTA, or skeleton text.
  @provenance Sweep concept adapted from svelte-animations (github.com/
    SikandarJODD/svelte-animations, MIT — Svelte Magic UI port); re-skinned
    2026-09-14 on slev12397/beautiful-ui@ff0f74d components/atoms/Shimmer.tsx
    (MIT, Copyright (c) 2026 Shane Levine — see NOTICE). MIT preserved for both.

  Updated 2026-09-14 (beautiful-ui re-skin, lane A). Two changes:

  1. The band is now the source's ink ramp on ripple tokens
     (--ripple-muted-foreground → --ripple-surface-foreground → back) instead
     of a hardcoded rgba(255,255,255,.85), so it reads on a light theme and
     follows a host's retheme. Scoped CSS reads the :root --ripple-* property,
     not the --color-ripple-* @theme alias, which only exists for Tailwind's
     utility compiler.
  2. It sets `color: transparent` so background-clip:text actually shows.
     This fixes a latent no-op: the previous version clipped a background to
     the glyphs while leaving the text opaque, so the sweep was painted
     BEHIND fully-opaque letters and never visible.

  `width` keeps its documented meaning — the highlight band's half-width, now
  expressed as the gradient's ramp offset either side of centre rather than a
  no-repeat band, which is what makes a full-width clipped gradient possible.
  Props (duration, width, children, hasChildren) are unchanged.

  Updated 2026-09-12: body gate is `hasChildren || children` with an optional
  `children?.()` call, so a hand-written Svelte caller that passes children but no
  `hasChildren` renders them. The spec renderer's `hasChildren` path is unchanged.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    /** Seconds per sweep. Default 2. */
    duration?: number;
    /** Highlight band width (CSS length). Default '100px'. */
    width?: string;
    children?: Snippet;
    hasChildren?: boolean;
  }
  let { id, class: className, style, duration = 2, width = '100px', children, hasChildren = false }: Props = $props();
  const styleString = $derived([
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : '',
    `--shimmer-duration:${duration}s`,
    `--shimmer-width:${width}`,
  ].filter(Boolean).join(';'));
</script>

<span {id} data-shimmer class={cn('ripple-shimmer relative inline-flex items-center', className)} style={styleString}>
  {#if hasChildren || children}{@render children?.()}{/if}
</span>

<style>
  .ripple-shimmer {
    background-image: linear-gradient(
      90deg,
      var(--ripple-muted-foreground) calc(50% - var(--shimmer-width, 100px)),
      var(--ripple-surface-foreground) 50%,
      var(--ripple-muted-foreground) calc(50% + var(--shimmer-width, 100px))
    );
    background-size: 200% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    animation: ripple-shimmer-sweep var(--shimmer-duration, 2s) linear infinite;
  }
  @keyframes ripple-shimmer-sweep {
    from { background-position: 150% 0; }
    to { background-position: -50% 0; }
  }
  /* Reduced motion: no sweep, and the text goes back to painting itself —
     a frozen gradient would leave half the label muted. */
  @media (prefers-reduced-motion: reduce) {
    .ripple-shimmer {
      animation: none;
      background-image: none;
      color: inherit;
    }
  }
</style>
