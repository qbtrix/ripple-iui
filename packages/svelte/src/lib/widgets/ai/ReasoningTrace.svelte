<!--
  @file widgets/ai/ReasoningTrace.svelte
  @description NEW (AI-native tier, 2026-06-24). An agent reasoning / thinking
    trace — the collapsed "Reasoned for N steps" affordance a generative-UI
    engine shows for an agent's chain of thought, expandable into the ordered
    list of steps. Each step has a title, an optional detail body, and a status
    (thinking | done); the active (thinking) step shows a shimmer. While
    `streaming` is true the summary reads "Reasoning…". Whole trace is a
    disclosure, collapsed by default.
  @a11y A real <button> disclosure with aria-expanded + aria-controls; steps
    render as an ordered list (<ol>). Status is conveyed by text + icon, not
    color alone. The shimmer freezes under prefers-reduced-motion.
  Modified: 2026-06-28 — forward node id (data-ripple-node) for visual-editor selection.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import BrainIcon from '@lucide/svelte/icons/brain';
  import CheckIcon from '@lucide/svelte/icons/check';

  interface Step {
    title: string;
    detail?: string;
    status?: 'thinking' | 'done';
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Ordered reasoning steps. */
    steps?: Step[];
    /** Agent is still reasoning — summary reads "Reasoning…". */
    streaming?: boolean;
    /** Initial collapsed state. Default true (collapsed). */
    collapsed?: boolean;
  }

  let {
    id,
    class: className,
    style,
    steps = [],
    streaming = false,
    collapsed = true,
  }: Props = $props();

  // svelte-ignore state_referenced_locally — one-time seed from `collapsed`.
  let internalOpen = $state(!collapsed);
  const isOpen = $derived(internalOpen);

  function toggle() {
    internalOpen = !internalOpen;
  }

  const count = $derived(steps.length);
  const summary = $derived(
    streaming
      ? 'Reasoning…'
      : count === 0
        ? 'No reasoning steps'
        : `Reasoned for ${count} step${count === 1 ? '' : 's'}`
  );

  const bodyId = $derived(`${id ?? 'reasoning-trace'}-body`);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div
  {id}
  data-ripple-node={id}
  data-variant="default"
  data-state={streaming ? 'streaming' : 'done'}
  class={cn('ripple-reasoning-trace rounded-md border border-border bg-muted/30 overflow-hidden text-sm', className)}
  style={styleString}
>
  <button
    type="button"
    aria-expanded={isOpen}
    aria-controls={bodyId}
    onclick={toggle}
    class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
  >
    <span class="shrink-0 text-muted-foreground" aria-hidden="true">
      <BrainIcon size={14} />
    </span>
    <span
      class={cn(
        'flex-1 text-[13px] font-medium text-muted-foreground',
        streaming && 'ripple-reasoning-shimmer'
      )}
    >
      {summary}
    </span>
    <span
      class={cn('shrink-0 text-muted-foreground/60 transition-transform', isOpen && 'rotate-90')}
      aria-hidden="true"
    >
      <ChevronRightIcon size={14} />
    </span>
  </button>

  {#if isOpen}
    <div id={bodyId} class="border-t border-border px-3 py-2.5">
      {#if count === 0}
        <div class="text-[12.5px] text-muted-foreground italic">No reasoning steps to show.</div>
      {:else}
        <ol class="ripple-reasoning-steps space-y-2.5">
          {#each steps as step, i (i)}
            {@const thinking = step.status === 'thinking'}
            <li class="flex gap-2.5">
              <span
                class={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px]',
                  thinking
                    ? 'border-ripple-info/40 bg-ripple-info/10 text-ripple-info'
                    : 'border-ripple-success/40 bg-ripple-success/10 text-ripple-success'
                )}
                aria-hidden="true"
              >
                {#if thinking}
                  <span class="ripple-reasoning-dot block h-1.5 w-1.5 rounded-full bg-ripple-info"></span>
                {:else}
                  <CheckIcon size={10} />
                {/if}
              </span>
              <div class="min-w-0 flex-1">
                <div class={cn('text-[13px] font-medium', thinking && 'ripple-reasoning-shimmer')}>
                  {step.title}
                  <span class="sr-only">— {thinking ? 'thinking' : 'done'}</span>
                </div>
                {#if step.detail}
                  <div class="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {step.detail}
                  </div>
                {/if}
              </div>
            </li>
          {/each}
        </ol>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ripple-reasoning-shimmer {
    background: linear-gradient(
      90deg,
      currentColor 0%,
      color-mix(in oklab, currentColor 30%, transparent) 50%,
      currentColor 100%
    );
    background-size: 200% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: ripple-reasoning-sweep 1.4s linear infinite;
  }
  .ripple-reasoning-dot {
    animation: ripple-reasoning-pulse 1s ease-in-out infinite;
  }
  @keyframes ripple-reasoning-sweep {
    from {
      background-position: 200% 0;
    }
    to {
      background-position: -200% 0;
    }
  }
  @keyframes ripple-reasoning-pulse {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple-reasoning-shimmer {
      animation: none;
      background: none;
      -webkit-text-fill-color: currentColor;
    }
    .ripple-reasoning-dot {
      animation: none;
    }
  }
</style>
