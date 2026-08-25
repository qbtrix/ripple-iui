<!--
  @file widgets/premium/Marquee.svelte
  @description Seamless horizontal/vertical marquee. Duplicates its track and
    translates via a pure-CSS keyframe (Tier 0 — no JS engine, SSR-safe).
  @provenance Adapted from svelte-animations (github.com/SikandarJODD/
    svelte-animations, MIT — Svelte Magic UI port). Ripple-shaped; MIT preserved.
  @created 2026-05-30 — RFC 12 premium pack.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    /** Seconds per loop. Default 30. */
    duration?: number;
    /** Pause on hover. Default true. */
    pauseOnHover?: boolean;
    /** Reverse direction. Default false. */
    reverse?: boolean;
    /** 'horizontal' | 'vertical'. Default 'horizontal'. */
    direction?: 'horizontal' | 'vertical';
    children?: Snippet;
    hasChildren?: boolean;
  }
  let { id, class: className, style, duration = 30, pauseOnHover = true, reverse = false, direction = 'horizontal', children, hasChildren = false }: Props = $props();
  const styleString = $derived([
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : '',
    `--marquee-duration:${duration}s`,
  ].filter(Boolean).join(';'));
  const vertical = $derived(direction === 'vertical');
</script>

<div {id} class={cn('group flex overflow-hidden', vertical ? 'flex-col' : 'flex-row', className)} style={styleString} data-marquee data-reverse={reverse} data-pause-hover={pauseOnHover}>
  {#each [0, 1] as _}
    <div data-marquee-track class={cn('flex shrink-0 items-center justify-around gap-4', vertical ? 'flex-col' : 'flex-row', 'ripple-marquee-track', vertical ? 'ripple-marquee-v' : 'ripple-marquee-h', reverse && 'ripple-marquee-reverse')} aria-hidden={_ === 1 ? 'true' : undefined}>
      {#if hasChildren && children}{@render children()}{/if}
    </div>
  {/each}
</div>

<style>
  .ripple-marquee-track { animation: ripple-marquee-x var(--marquee-duration, 30s) linear infinite; }
  .ripple-marquee-v { animation-name: ripple-marquee-y; }
  .ripple-marquee-reverse { animation-direction: reverse; }
  :global([data-pause-hover="true"]:hover) .ripple-marquee-track { animation-play-state: paused; }
  @keyframes ripple-marquee-x { from { transform: translateX(0); } to { transform: translateX(-100%); } }
  @keyframes ripple-marquee-y { from { transform: translateY(0); } to { transform: translateY(-100%); } }
  @media (prefers-reduced-motion: reduce) { .ripple-marquee-track { animation: none; } }
</style>
