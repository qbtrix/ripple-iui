<!--
  @file widgets/premium/Spotlight.svelte
  @description A radial highlight that follows the cursor across its children.
    Pointer wiring is client-only (onMount + `typeof window` guard, rAF-throttled,
    mirrors the Phase-2 proximityHover pattern); it sets --spotlight-x/-y custom
    properties that a CSS radial-gradient consumes. SSR renders a centred resting
    glow — no JS engine import, SSR-safe.
  @provenance Adapted from aceternity.sveltekit.io (MIT — Svelte Aceternity
    port). Ripple-shaped; MIT preserved.
  @created 2026-05-30 — RFC 12 premium pack.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    /** Highlight diameter (CSS length). Default '300px'. */
    size?: string;
    /** Highlight colour. Default a translucent white. */
    color?: string;
    children?: Snippet;
    hasChildren?: boolean;
  }
  let { id, class: className, style, size = '300px', color = 'rgba(255,255,255,0.12)', children, hasChildren = false }: Props = $props();
  const styleString = $derived([
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : '',
    `--spotlight-size:${size}`,
    `--spotlight-color:${color}`,
  ].filter(Boolean).join(';'));

  let root: HTMLDivElement | undefined = $state();

  onMount(() => {
    if (typeof window === 'undefined' || !root) return;
    const el = root;
    let frame = 0;
    let pending: { x: number; y: number } | null = null;
    const apply = () => {
      frame = 0;
      if (!pending) return;
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--spotlight-x', `${pending.x - rect.left}px`);
      el.style.setProperty('--spotlight-y', `${pending.y - rect.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      pending = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    el.addEventListener('pointermove', onMove);
    return () => {
      el.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  });
</script>

<div bind:this={root} {id} class={cn('group relative overflow-hidden', className)} style={styleString}>
  <div
    data-spotlight
    aria-hidden="true"
    class="ripple-spotlight pointer-events-none absolute inset-0"
  ></div>
  {#if hasChildren && children}{@render children()}{/if}
</div>

<style>
  .ripple-spotlight {
    background: radial-gradient(
      var(--spotlight-size, 300px) circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%),
      var(--spotlight-color, rgba(255, 255, 255, 0.12)),
      transparent 80%
    );
    opacity: 0;
    transition: opacity 200ms ease;
  }
  .group:hover .ripple-spotlight { opacity: 1; }
  @media (prefers-reduced-motion: reduce) { .ripple-spotlight { transition: none; } }
</style>
