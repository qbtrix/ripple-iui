<!--
  CountBadge.svelte — the small count pill that sits on a call control (chat
  toggle, dock chat button). NEW 2026-09-30 (call UI new look, slice 0).
  Shows N, "99+" over 99, and "@" when you were mentioned (the mention wins
  over the count). Renders nothing for 0 with no mention. Positioned absolute
  at the top-right corner of its (relative) parent. Every attribute, notably
  data-testid, lands on the pill so hosts keep their own test ids. Colours are
  ripple tokens only.
-->
<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils.js';

  let {
    count = 0,
    mention = false,
    max = 99,
    class: className,
    ...rest
  }: HTMLAttributes<HTMLSpanElement> & { count?: number; mention?: boolean; max?: number } = $props();

  const text = $derived(mention ? '@' : count > max ? `${max}+` : String(count));
</script>

{#if mention || count > 0}
  <span
    data-slot="count-badge"
    data-mention={mention ? '' : undefined}
    class={cn('ripple-count-badge', className)}
    {...rest}>{text}</span
  >
{/if}

<style>
  .ripple-count-badge {
    position: absolute;
    top: -0.25rem;
    right: -0.25rem;
    min-width: 1.25rem;
    height: 1.25rem;
    padding-inline: 0.3rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1.25rem;
    text-align: center;
    font-variant-numeric: tabular-nums;
    pointer-events: none;
    color: var(--ripple-accent-foreground);
    background: var(--ripple-accent);
  }
  .ripple-count-badge[data-mention] {
    color: var(--ripple-accent);
    background: var(--ripple-accent-foreground);
    box-shadow: 0 0 0 1.5px var(--ripple-accent);
  }
</style>
