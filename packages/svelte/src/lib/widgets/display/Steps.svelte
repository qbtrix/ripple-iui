<!-- widgets/display/Steps.svelte — the `steps` widget: a numbered process as an ordered list,
     vertical (pips joined by a rule) or horizontal (pips joined by a line from md up).
     Each step may carry a `status` ('done' | 'current' | 'upcoming' | 'failed'), set per step
     so a lifecycle can show an earlier step not done while a later one runs. The current step
     gets aria-current="step"; done and failed pips draw a check or a cross with a spoken label
     ("Done", "Failed"), so state is never colour alone; an explicit `number` still wins over the
     glyph. Status styling is on --ripple-* tokens (accent fill for done, an accent ring with the
     surface ink for current, since accent text misses 4.5:1 on dark; error for
     failed, muted for upcoming) and its colour change honours reduced motion.
     A step without a status renders exactly as it always has (Steps.test.ts pins the classes). -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';

  type Status = 'done' | 'current' | 'upcoming' | 'failed';

  interface Step {
    title: string;
    description?: string;
    /** Optional explicit number; otherwise auto-incremented. */
    number?: number | string;
    /** Where this step stands. Omit for a plain numbered list. */
    status?: Status;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    steps?: Step[];
    /** "vertical" (default) or "horizontal" pip layout. */
    orientation?: 'vertical' | 'horizontal';
  }

  let {
    id, class: className, style,
    steps = [], orientation = 'vertical'
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const MOTION = 'transition-colors duration-200 ease-ripple-out motion-reduce:transition-none';
  const PIP: Record<Status, string> = {
    done: `border-ripple-accent bg-ripple-accent text-ripple-accent-foreground ${MOTION}`,
    current: `border-ripple-accent bg-ripple-surface text-ripple-surface-foreground ring-2 ring-ripple-accent/30 ${MOTION}`,
    upcoming: `border-ripple-border bg-ripple-surface text-ripple-muted-foreground ${MOTION}`,
    failed: `border-ripple-error bg-ripple-error text-ripple-error-foreground ${MOTION}`,
  };
  const pipClass = (base: string, s?: Status) => cn(base, s && PIP[s]);
  const titleClass = (s?: Status) =>
    cn('text-sm font-semibold', s === 'upcoming' && 'text-ripple-muted-foreground', s === 'failed' && 'text-ripple-error-text');
</script>

{#snippet mark(step: Step, i: number)}
  {#if step.number == null && step.status === 'done'}
    <CheckIcon size={14} strokeWidth={2.5} aria-hidden="true" /><span class="sr-only">Done</span>
  {:else if step.number == null && step.status === 'failed'}
    <XIcon size={14} strokeWidth={2.5} aria-hidden="true" /><span class="sr-only">Failed</span>
  {:else}
    {step.number ?? i + 1}
  {/if}
{/snippet}

{#if orientation === 'horizontal'}
  <ol
    {id}
    class={cn('flex w-full items-stretch', className)}
    style={styleString}
  >
    {#each steps as step, i}
      <li class="flex-1 flex items-start gap-3" aria-current={step.status === 'current' ? 'step' : undefined} data-status={step.status}>
        <div class="flex flex-col items-center">
          <div class={pipClass('flex size-7 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold tabular-nums', step.status)}>
            {@render mark(step, i)}
          </div>
        </div>
        <div class="flex-1 pt-0.5">
          <div class={titleClass(step.status)}>{step.title}</div>
          {#if step.description}
            <p class="text-sm text-muted-foreground mt-0.5">{step.description}</p>
          {/if}
        </div>
        {#if i < steps.length - 1}
          <div class={cn('hidden md:block border-t border-border flex-1 mt-3.5', step.status === 'done' && 'border-ripple-accent')}></div>
        {/if}
      </li>
    {/each}
  </ol>
{:else}
  <ol
    {id}
    class={cn('flex flex-col gap-0', className)}
    style={styleString}
  >
    {#each steps as step, i}
      <li class="flex gap-3" aria-current={step.status === 'current' ? 'step' : undefined} data-status={step.status}>
        <div class="flex flex-col items-center">
          <div class={pipClass('flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold tabular-nums', step.status)}>
            {@render mark(step, i)}
          </div>
          {#if i < steps.length - 1}
            <div class={cn('w-px flex-1 bg-border mt-1 mb-1 min-h-3', step.status === 'done' && 'bg-ripple-accent')}></div>
          {/if}
        </div>
        <div class="pb-4 flex-1 pt-0.5">
          <div class={titleClass(step.status)}>{step.title}</div>
          {#if step.description}
            <p class="text-sm text-muted-foreground mt-1">{step.description}</p>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
{/if}
