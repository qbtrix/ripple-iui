<!--
  @file widgets/ai/StreamText.svelte
  @description NEW (AI-native tier, 2026-06-24). Progressive / streaming text
    render — the surface a generative-UI engine shows while an agent is still
    producing tokens. Two modes:
      1. LIVE STREAM: bind `text` to a state path that GROWS. Whatever is in the
         prop renders as-is; a blinking caret + aria-busy signal "more coming"
         while `streaming` is true.
      2. TYPEWRITER: pass a static `text` + a `speed` (chars/sec) and the string
         types itself in. Honors prefers-reduced-motion (paints the full string
         at once, no animation, no timer).
    When `markdown` is true it REUSES the existing Markdown widget to render the
    revealed slice — it does not reimplement a parser.
  @a11y aria-live="polite" announces streamed text; aria-busy reflects the
    in-flight state. The caret is decorative (aria-hidden) and frozen under
    reduced motion.
  Modified: 2026-06-28 — forward node id (data-ripple-node) for visual-editor selection.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';
  import Markdown from '$lib/widgets/display/Markdown.svelte';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Text to render. In live-stream mode bind this to a growing state path. */
    text?: string;
    /** Show the blinking caret + aria-busy. True while the agent is producing. */
    streaming?: boolean;
    /** Render the revealed text as markdown (reuses the Markdown widget). */
    markdown?: boolean;
    /** Typewriter speed in chars/sec. When set, the string types itself in. */
    speed?: number;
    /** Streaming finished — clears busy/caret even if `streaming` was left true. */
    done?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }

  let {
    id,
    class: className,
    style,
    text = '',
    streaming = false,
    markdown = false,
    speed,
    done = false,
    size = 'md',
  }: Props = $props();

  // Typewriter mode is opt-in via `speed`. Without it we render `text` verbatim
  // (the live-stream path — the prop itself is what grows).
  const typewriter = $derived(typeof speed === 'number' && speed > 0);

  let reduceMotion = $state(false);
  // How many chars of `text` the typewriter has revealed so far.
  let revealed = $state(0);

  onMount(() => {
    reduceMotion =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  });

  // Drive the typewriter. Depends on text/speed/typewriter/reduceMotion ONLY —
  // it must not read `revealed` reactively, or writing `revealed` inside the
  // interval would re-trigger this effect and thrash the timer. Position is
  // tracked in a local `pos`; `revealed` is write-only output here.
  $effect(() => {
    if (!typewriter || reduceMotion) {
      revealed = text.length;
      return;
    }
    const len = text.length;
    let pos = 0; // restart the reveal whenever the source string changes
    revealed = 0;
    if (pos >= len) {
      revealed = len;
      return;
    }
    const interval = setInterval(() => {
      pos += 1;
      revealed = pos;
      if (pos >= len) clearInterval(interval);
    }, Math.max(8, 1000 / (speed as number)));

    return () => clearInterval(interval);
  });

  const shown = $derived(typewriter && !reduceMotion ? text.slice(0, revealed) : text);

  // Busy while streaming and not explicitly done, OR while the typewriter is
  // still catching up to the source string.
  const typing = $derived(typewriter && !reduceMotion && revealed < text.length);
  const busy = $derived((streaming && !done) || typing);

  // The caret rides at the end of the revealed text while busy.
  const showCaret = $derived(busy);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const sizeClass: Record<string, string> = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };
</script>

<div
  {id}
  data-ripple-node={id}
  data-variant="default"
  data-size={size}
  data-state={busy ? 'streaming' : 'done'}
  class={cn('ripple-stream-text leading-relaxed', sizeClass[size], className)}
  style={styleString}
  aria-live="polite"
  aria-busy={busy}
>
  {#if markdown}
    <span class="ripple-stream-text__body align-baseline"><Markdown content={shown} /></span>
  {:else}
    <span class="ripple-stream-text__body whitespace-pre-wrap">{shown}</span>
  {/if}{#if showCaret}<span
      class={cn('ripple-stream-caret', reduceMotion && 'ripple-stream-caret--static')}
      aria-hidden="true"
    ></span>{/if}
</div>

<style>
  .ripple-stream-caret {
    display: inline-block;
    width: 0.5em;
    height: 1.05em;
    margin-left: 1px;
    vertical-align: text-bottom;
    background: currentColor;
    opacity: 0.85;
    animation: ripple-stream-blink 1s step-end infinite;
  }
  .ripple-stream-caret--static {
    animation: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple-stream-caret {
      animation: none;
    }
  }
  @keyframes ripple-stream-blink {
    0%,
    50% {
      opacity: 0.85;
    }
    50.01%,
    100% {
      opacity: 0;
    }
  }
</style>
