<!--
  @file widgets/premium/BorderBeam.svelte
  @description A conic-gradient beam that travels the border of its container via
    a pure-CSS keyframe (Tier 0 — no JS engine, SSR-safe). Wraps its children and
    overlays a [data-border-beam] tracer ring.
  @provenance Adapted from svelte-animations (github.com/SikandarJODD/
    svelte-animations, MIT — Svelte Magic UI port). Ripple-shaped; MIT preserved.
  @created 2026-05-30 — RFC 12 premium pack.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    /** Beam thickness in px. Default 1.5. */
    size?: number;
    /** Seconds per orbit. Default 8. */
    duration?: number;
    /** Gradient start colour. Default '#ffaa40'. */
    colorFrom?: string;
    /** Gradient end colour. Default '#9c40ff'. */
    colorTo?: string;
    children?: Snippet;
    hasChildren?: boolean;
  }
  let { id, class: className, style, size = 1.5, duration = 8, colorFrom = '#ffaa40', colorTo = '#9c40ff', children, hasChildren = false }: Props = $props();
  const styleString = $derived([
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : '',
    `--beam-size:${size}px`,
    `--beam-duration:${duration}s`,
    `--beam-from:${colorFrom}`,
    `--beam-to:${colorTo}`,
  ].filter(Boolean).join(';'));
</script>

<div {id} class={cn('relative rounded-[inherit]', className)} style={styleString}>
  <div
    data-border-beam
    aria-hidden="true"
    class="ripple-border-beam pointer-events-none absolute inset-0 rounded-[inherit]"
  ></div>
  {#if hasChildren && children}{@render children()}{/if}
</div>

<style>
  .ripple-border-beam {
    padding: var(--beam-size, 1.5px);
    background: conic-gradient(from var(--beam-angle, 0deg), transparent 0 75%, var(--beam-from, #ffaa40), var(--beam-to, #9c40ff));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: ripple-border-beam-spin var(--beam-duration, 8s) linear infinite;
  }
  @property --beam-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
  @keyframes ripple-border-beam-spin { to { --beam-angle: 360deg; } }
  @media (prefers-reduced-motion: reduce) { .ripple-border-beam { animation: none; } }
</style>
