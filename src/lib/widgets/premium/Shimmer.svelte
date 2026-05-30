<!--
  @file widgets/premium/Shimmer.svelte
  @description A sweeping highlight gradient that travels across its children via
    an animated background-position keyframe (Tier 0 — no JS engine, SSR-safe).
    Useful for shimmering buttons, skeleton text, or "new" badges.
  @provenance Adapted from svelte-animations (github.com/SikandarJODD/
    svelte-animations, MIT — Svelte Magic UI port). Ripple-shaped; MIT preserved.
  @created 2026-05-30 — RFC 12 premium pack.
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
  {#if hasChildren && children}{@render children()}{/if}
</span>

<style>
  .ripple-shimmer {
    --shimmer-color: rgba(255, 255, 255, 0.85);
    background: linear-gradient(110deg, transparent 40%, var(--shimmer-color) 50%, transparent 60%) no-repeat;
    background-size: var(--shimmer-width, 100px) 100%;
    background-clip: text;
    -webkit-background-clip: text;
    animation: ripple-shimmer-sweep var(--shimmer-duration, 2s) linear infinite;
  }
  @keyframes ripple-shimmer-sweep {
    from { background-position: -150% 0; }
    to { background-position: 250% 0; }
  }
  @media (prefers-reduced-motion: reduce) { .ripple-shimmer { animation: none; } }
</style>
