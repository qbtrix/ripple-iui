<!--
  ControlBar.svelte — the container for a row of ControlButtons.
  NEW 2026-09-30 (call UI new look, slice 0).
  role=group with an aria-label (not a toolbar: it adds no arrow-key roving).
  Same three looks as ControlButton, passed separately to each (no context):
    pill    — floating glass capsule (the Glass layout)
    bar     — full-width 56px bar docked to the bottom edge (Focus)
    classic — a plain centred row (today's look)
  size="compact" drops the chrome for the dock and PiP. Forwards all div
  attributes. Tokens only.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils.js';

  let {
    label,
    variant = 'classic',
    size = 'default',
    class: className,
    children,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & {
    label?: string;
    variant?: 'pill' | 'bar' | 'classic';
    size?: 'default' | 'compact';
    children?: Snippet;
  } = $props();
</script>

<div
  role="group"
  aria-label={label}
  data-slot="control-bar"
  data-variant={variant}
  data-size={size}
  class={cn('ripple-ctl-bar', className)}
  {...rest}
>
  {@render children?.()}
</div>

<style>
  .ripple-ctl-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--ripple-surface-foreground);
  }
  .ripple-ctl-bar[data-variant='pill'] {
    gap: 0.375rem;
    padding: 0.375rem;
    border-radius: 999px;
    border: 1px solid var(--ripple-border);
    background: color-mix(in oklch, var(--ripple-surface) 80%, transparent);
    backdrop-filter: blur(28px) saturate(1.5);
    -webkit-backdrop-filter: blur(28px) saturate(1.5);
    box-shadow: 0 18px 50px color-mix(in oklch, var(--ripple-surface) 60%, transparent);
  }
  .ripple-ctl-bar[data-variant='bar'] {
    justify-content: center;
    gap: 0.25rem;
    width: 100%;
    height: 3.5rem;
    padding-inline: 1rem;
    border-top: 1px solid var(--ripple-border);
    background: color-mix(in oklch, var(--ripple-surface) 88%, transparent);
  }
  .ripple-ctl-bar[data-size='compact'] {
    gap: 0.375rem;
    width: auto;
    height: auto;
    padding: 0;
    border: 0;
    background: none;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
</style>
