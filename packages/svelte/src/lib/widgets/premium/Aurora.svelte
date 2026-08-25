<!--
  @file widgets/premium/Aurora.svelte
  @description A soft, slowly drifting multi-radial-gradient backdrop rendered
    behind its children (Tier 0 — CSS keyframe shifting gradient positions, no
    JS engine, SSR-safe). Used as a hero/section background.
  @provenance Adapted from aceternity.sveltekit.io (MIT — Svelte Aceternity
    port). Ripple-shaped; MIT preserved.
  @created 2026-05-30 — RFC 12 premium pack.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    /** Gradient stops driving the aurora. Default a blue/violet/teal blend. */
    colors?: string[];
    /** Seconds per drift cycle (lower = faster). Default 12. */
    speed?: number;
    children?: Snippet;
    hasChildren?: boolean;
  }
  let {
    id, class: className, style,
    colors = ['#3b82f6', '#8b5cf6', '#06b6d4'],
    speed = 12,
    children, hasChildren = false,
  }: Props = $props();
  const [c1, c2, c3] = $derived([colors[0] ?? '#3b82f6', colors[1] ?? '#8b5cf6', colors[2] ?? colors[0] ?? '#06b6d4']);
  const styleString = $derived([
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : '',
    `--aurora-speed:${speed}s`,
    `--aurora-c1:${c1}`,
    `--aurora-c2:${c2}`,
    `--aurora-c3:${c3}`,
  ].filter(Boolean).join(';'));
</script>

<div {id} class={cn('relative overflow-hidden isolate', className)} style={styleString}>
  <div
    data-aurora
    aria-hidden="true"
    class="ripple-aurora pointer-events-none absolute inset-0 -z-10"
  ></div>
  {#if hasChildren && children}{@render children()}{/if}
</div>

<style>
  .ripple-aurora {
    background:
      radial-gradient(40% 50% at 20% 20%, var(--aurora-c1) 0%, transparent 60%),
      radial-gradient(45% 55% at 80% 30%, var(--aurora-c2) 0%, transparent 60%),
      radial-gradient(50% 60% at 50% 80%, var(--aurora-c3) 0%, transparent 60%);
    filter: blur(60px) saturate(1.2);
    opacity: 0.45;
    background-size: 200% 200%;
    animation: ripple-aurora-drift var(--aurora-speed, 12s) ease-in-out infinite alternate;
  }
  @keyframes ripple-aurora-drift {
    from { background-position: 0% 50%, 100% 0%, 50% 100%; }
    to { background-position: 100% 50%, 0% 100%, 50% 0%; }
  }
  @media (prefers-reduced-motion: reduce) { .ripple-aurora { animation: none; } }
</style>
