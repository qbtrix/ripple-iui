<!--
  @file widgets/ai/ReasoningTrace.svelte
  @description NEW (AI-native tier, 2026-06-24). An agent reasoning / thinking
    trace — the collapsed "Reasoned for N steps" affordance a generative-UI
    engine shows for an agent's chain of thought, expandable into the ordered
    list of steps. Each step has a title, an optional detail body, and a status
    (thinking | done); the active (thinking) step shows a shimmer. While
    `streaming` is true the summary reads "Reasoning…". Whole trace is a
    disclosure, collapsed by default.
  @a11y A real button disclosure with aria-expanded + aria-controls; steps
    render as an ordered list (ol). Status is conveyed by text + icon, not
    color alone. The trace body is `inert` while collapsed so the hidden steps
    leave the accessibility tree. Every animation freezes under
    prefers-reduced-motion.
  Modified: 2026-06-28 — forward node id (data-ripple-node) for visual-editor selection.
  Modified: 2026-09-14 — re-skinned on beautiful-ui. The disclosure now HEIGHT-
    ANIMATES: the body is always mounted inside a grid whose grid-template-rows
    goes 0fr → 1fr, so expanding wipes open instead of snapping. The card frame
    is dropped for the source's bare, indented trace hanging off a hairline
    connector; steps stagger in with fade-up; the settled summary fades in; the
    thinking step is a spinner ring rather than a pulsing dot. Props, events
    and the disclosure contract are untouched.
  origin: slev12397/beautiful-ui@ff0f74d components/primitives/ThinkingState.tsx
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
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
  class={cn('ripple-reasoning-trace text-sm', className)}
  style={styleString}
>
  <button
    type="button"
    aria-expanded={isOpen}
    aria-controls={bodyId}
    onclick={toggle}
    class="-mx-1.5 flex w-fit items-center gap-2 rounded-ripple px-1.5 py-1 text-left transition-colors duration-100 hover:bg-ripple-accent/10"
  >
    <span
      class={cn(
        'shrink-0 transition-colors duration-200',
        streaming ? 'text-ripple-muted-foreground' : 'text-ripple-muted-foreground/60'
      )}
      aria-hidden="true"
    >
      <BrainIcon size={14} />
    </span>
    <span role="status" class="contents">
      {#if streaming}
        <span class="ripple-reasoning-shimmer text-[13px] font-medium whitespace-nowrap">
          {summary}
        </span>
      {:else}
        <span
          class="ripple-reasoning-fade-in text-[13px] font-medium whitespace-nowrap text-ripple-muted-foreground"
        >
          {summary}
        </span>
      {/if}
    </span>
    <span
      class={cn(
        'shrink-0 text-ripple-muted-foreground/60 transition-transform duration-300',
        isOpen && 'rotate-180'
      )}
      aria-hidden="true"
    >
      <ChevronDownIcon size={14} />
    </span>
  </button>

  <!-- The height animation: body stays mounted, the grid row goes 0fr → 1fr. -->
  <div
    id={bodyId}
    inert={!isOpen}
    class="ripple-reasoning-body grid transition-[grid-template-rows,opacity] duration-[400ms] ease-ripple-out"
    style:grid-template-rows={isOpen ? '1fr' : '0fr'}
    style:opacity={isOpen ? 1 : 0}
  >
    <div class="overflow-hidden">
      <div class="relative mt-1 ml-[5px] pl-4">
        <span aria-hidden="true" class="absolute top-0 bottom-0 left-[3px] w-px bg-ripple-border"></span>
        {#if count === 0}
          <div class="py-1 text-[12.5px] text-ripple-muted-foreground italic">
            No reasoning steps to show.
          </div>
        {:else}
          <ol class="ripple-reasoning-steps flex flex-col gap-1 py-1">
            {#each steps as step, i (i)}
              {@const thinking = step.status === 'thinking'}
              <li
                class={cn(
                  'flex min-h-7 items-start gap-2 rounded-md px-1.5 py-0.5',
                  isOpen && 'ripple-reasoning-fade-up'
                )}
                style:animation-delay={`${i * 120}ms`}
              >
                <span class="mt-1 flex size-3.5 shrink-0 items-center justify-center" aria-hidden="true">
                  {#if thinking}
                    <span
                      class="ripple-reasoning-ring size-3 animate-spin rounded-full border-[1.5px] border-ripple-border border-t-ripple-muted-foreground"
                    ></span>
                  {:else}
                    <CheckIcon size={13} class="text-ripple-muted-foreground/70" />
                  {/if}
                </span>
                <div class="min-w-0 flex-1">
                  <div
                    class={cn(
                      'text-[12.5px] font-medium',
                      thinking && 'ripple-reasoning-shimmer'
                    )}
                  >
                    {step.title}
                    <span class="sr-only">— {thinking ? 'thinking' : 'done'}</span>
                  </div>
                  {#if step.detail}
                    <div
                      class="mt-0.5 text-[11.5px] leading-relaxed whitespace-pre-wrap text-ripple-muted-foreground"
                    >
                      {step.detail}
                    </div>
                  {/if}
                </div>
              </li>
            {/each}
          </ol>
        {/if}
      </div>
    </div>
  </div>
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
  .ripple-reasoning-fade-in {
    animation: ripple-reasoning-fade-in 350ms var(--ripple-ease-out) both;
  }
  .ripple-reasoning-fade-up {
    animation: ripple-reasoning-fade-up 320ms var(--ripple-ease-out) both;
  }
  @keyframes ripple-reasoning-sweep {
    from {
      background-position: 200% 0;
    }
    to {
      background-position: -200% 0;
    }
  }
  @keyframes ripple-reasoning-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes ripple-reasoning-fade-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  /* Tailwind's animate-spin ships no reduced-motion guard — this is it. */
  @media (prefers-reduced-motion: reduce) {
    .ripple-reasoning-shimmer {
      animation: none;
      background: none;
      -webkit-text-fill-color: currentColor;
    }
    .ripple-reasoning-fade-in,
    .ripple-reasoning-fade-up,
    .ripple-reasoning-ring {
      animation: none;
    }
    .ripple-reasoning-body {
      transition: none;
    }
  }
</style>
