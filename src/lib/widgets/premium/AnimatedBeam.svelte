<!--
  @file widgets/premium/AnimatedBeam.svelte
  @description An SVG curved path with an animated gradient stroke that flows
    between two anchors. Pure SVG + CSS (Tier 0 — no JS engine, SSR-safe). The
    curve is self-contained (viewBox-relative); a host that needs measured
    endpoints can overlay it absolutely. The flowing pulse is a CSS
    stroke-dashoffset keyframe.
  @provenance Adapted from aceternity.sveltekit.io (MIT — Svelte Aceternity
    port). Ripple-shaped; MIT preserved.
  @created 2026-05-30 — RFC 12 premium pack.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    /** Seconds per flow. Default 4. */
    duration?: number;
    /** Arc height (viewBox units, negative bows up). Default -40. */
    curvature?: number;
    /** Gradient start colour. Default '#18CCFC'. */
    gradientStart?: string;
    /** Gradient stop colour. Default '#AE48FF'. */
    gradientStop?: string;
  }
  let { id, class: className, style, duration = 4, curvature = -40, gradientStart = '#18CCFC', gradientStop = '#AE48FF' }: Props = $props();
  const styleString = $derived([
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : '',
    `--beam-duration:${duration}s`,
  ].filter(Boolean).join(';'));
  // A horizontal quadratic curve across the viewBox, bowed by `curvature`.
  const path = $derived(`M 4 50 Q 100 ${50 + curvature} 196 50`);
  const gradientId = $derived(`ripple-beam-grad-${id ?? Math.random().toString(36).slice(2, 8)}`);
</script>

<svg {id} data-animated-beam viewBox="0 0 200 100" fill="none" preserveAspectRatio="none" class={cn('ripple-animated-beam w-full', className)} style={styleString} aria-hidden="true">
  <defs>
    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color={gradientStart} stop-opacity="0" />
      <stop offset="50%" stop-color={gradientStart} />
      <stop offset="100%" stop-color={gradientStop} stop-opacity="0" />
    </linearGradient>
  </defs>
  <path d={path} stroke="currentColor" stroke-opacity="0.12" stroke-width="1.5" />
  <path d={path} stroke={`url(#${gradientId})`} stroke-width="2" stroke-linecap="round" class="ripple-beam-flow" />
</svg>

<style>
  .ripple-beam-flow {
    stroke-dasharray: 40 220;
    animation: ripple-beam-flow var(--beam-duration, 4s) linear infinite;
  }
  @keyframes ripple-beam-flow { from { stroke-dashoffset: 260; } to { stroke-dashoffset: 0; } }
  @media (prefers-reduced-motion: reduce) { .ripple-beam-flow { animation: none; } }
</style>
