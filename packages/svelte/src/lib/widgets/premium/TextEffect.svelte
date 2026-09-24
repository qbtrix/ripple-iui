<!--
  @file widgets/premium/TextEffect.svelte
  @description Animates text in per-word or per-character with a staggered
    reveal. The stagger is pure CSS (each span gets an inline animation-delay) —
    Tier 0, no JS engine, SSR-safe. Effects: gradient sweep, fade-in, shimmer.
  @provenance Adapted from svelte-animations (github.com/SikandarJODD/
    svelte-animations, MIT — Svelte Magic UI port). Ripple-shaped; MIT preserved.
  @created 2026-05-30 — RFC 12 premium pack.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { asText } from '$lib/widgets/text-coerce';
  interface Props {
    id?: string; class?: string; style?: Record<string, string>;
    /** The text to animate (required). */
    text: string;
    /** Reveal effect. Default 'fade-in'. */
    effect?: 'gradient' | 'fade-in' | 'shimmer';
    /** Split granularity. Default 'word'. */
    by?: 'word' | 'char';
    /** Seconds between each unit. Default 0.05. */
    stagger?: number;
    children?: never;
    hasChildren?: boolean;
  }
  let { id, class: className, style, text = '', effect = 'fade-in', by = 'word', stagger = 0.05 }: Props = $props();
  const styleString = $derived(style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined);
  // Split into units. Word mode keeps spaces as separators (re-inserted between
  // spans so textContent reconstructs the original string); char mode keeps
  // every character including spaces.
  // `text` is required/string-typed but a binding can deliver a number — coerce
  // before .split so the per-word/char reveal never crashes the canvas.
  const safeText = $derived(asText(text));
  const units = $derived(by === 'char' ? Array.from(safeText) : safeText.split(' '));
</script>

<span {id} data-text-effect class={cn('ripple-text-effect inline-block', `ripple-te-${effect}`, className)} style={styleString} aria-label={text}>
  {#each units as unit, i}
    <span class="ripple-te-unit" style={`animation-delay:${(i * stagger).toFixed(3)}s`} aria-hidden="true">{unit === ' ' ? ' ' : unit}</span>{#if by === 'word' && i < units.length - 1}{' '}{/if}
  {/each}
</span>

<style>
  .ripple-te-unit {
    display: inline-block;
    white-space: pre;
    animation: ripple-te-fade 0.5s both;
  }
  .ripple-te-gradient .ripple-te-unit {
    background: linear-gradient(90deg, var(--ripple-te-from, #6366f1), var(--ripple-te-to, #ec4899));
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    animation: ripple-te-rise 0.5s both;
  }
  .ripple-te-shimmer .ripple-te-unit { animation: ripple-te-rise 0.5s both; }
  @keyframes ripple-te-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ripple-te-rise { from { opacity: 0; transform: translateY(0.3em); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) {
    .ripple-te-unit { animation: ripple-te-fade 0.01s both !important; transform: none !important; }
  }
</style>
