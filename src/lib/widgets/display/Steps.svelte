<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Step {
    title: string;
    description?: string;
    /** Optional explicit number; otherwise auto-incremented. */
    number?: number | string;
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
</script>

{#if orientation === 'horizontal'}
  <ol
    {id}
    class={cn('flex w-full items-stretch', className)}
    style={styleString}
  >
    {#each steps as step, i}
      <li class="flex-1 flex items-start gap-3">
        <div class="flex flex-col items-center">
          <div class="flex size-7 items-center justify-center rounded-full border border-ripple-border bg-ripple-muted/40 text-sm font-semibold tabular-nums">
            {step.number ?? i + 1}
          </div>
        </div>
        <div class="flex-1 pt-0.5">
          <div class="text-sm font-semibold">{step.title}</div>
          {#if step.description}
            <p class="text-sm text-muted-foreground mt-0.5">{step.description}</p>
          {/if}
        </div>
        {#if i < steps.length - 1}
          <div class="hidden md:block border-t border-ripple-border flex-1 mt-3.5"></div>
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
      <li class="flex gap-3">
        <div class="flex flex-col items-center">
          <div class="flex size-7 shrink-0 items-center justify-center rounded-full border border-ripple-border bg-ripple-muted/40 text-sm font-semibold tabular-nums">
            {step.number ?? i + 1}
          </div>
          {#if i < steps.length - 1}
            <div class="w-px flex-1 bg-ripple-border mt-1 mb-1 min-h-3"></div>
          {/if}
        </div>
        <div class="pb-4 flex-1 pt-0.5">
          <div class="text-sm font-semibold">{step.title}</div>
          {#if step.description}
            <p class="text-sm text-muted-foreground mt-1">{step.description}</p>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
{/if}
