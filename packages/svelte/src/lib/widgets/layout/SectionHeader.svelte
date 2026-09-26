<!--
  src/lib/widgets/layout/SectionHeader.svelte
  NEW 2026-09-25 (shell new-look slice 1). The group label above a run of
  ListRows: "Rooms 4 [+]". On `./ui` only (no registry or manifest entry).

  Collapsible when `collapsible` or `ontoggle` is set: the label and count
  become a disclosure <button aria-expanded> with a chevron. `open` is
  bindable and defaults to true, so it works uncontrolled; `ontoggle(next)`
  reports every flip for a host that keeps the state in a store. Pass
  `controls` with the id of the region it shows and hides.

  The region itself is the host's (`{#if open}` around the rows). Ripple's
  Collapsible renders its own title trigger with no slot for a custom header,
  so pairing the two means sharing `open` with Collapsible's `value` and
  `hideChevron`; SectionHeader does not change Collapsible.

  The `action` snippet (a "+" button, a menu) is a sibling of the toggle,
  never inside it.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils.js';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'ontoggle'> {
    class?: string;
    label?: string;
    count?: number | string;
    open?: boolean;
    collapsible?: boolean;
    ontoggle?: (open: boolean) => void;
    /** id of the region this header shows and hides (aria-controls). */
    controls?: string;
    action?: Snippet;
    /** Replaces `label` when given. */
    children?: Snippet;
  }

  let {
    class: className,
    label,
    count,
    open = $bindable(true),
    collapsible = false,
    ontoggle,
    controls,
    action,
    children,
    ...rest
  }: Props = $props();

  const isToggle = $derived(collapsible || !!ontoggle);

  function toggle() {
    open = !open;
    ontoggle?.(open);
  }
</script>

{#snippet body()}
  {#if isToggle}
    <ChevronRightIcon
      size={12}
      aria-hidden="true"
      class={cn('shrink-0 transition-transform duration-150 ease-ripple-out', open && 'rotate-90')}
    />
  {/if}
  <span class="truncate">{#if children}{@render children()}{:else}{label}{/if}</span>
  {#if count != null && count !== ''}
    <span data-section-count class="shrink-0 tabular-nums opacity-70">{count}</span>
  {/if}
{/snippet}

<div
  {...rest}
  class={cn('flex h-7 min-w-0 items-center gap-1 px-2 text-[12px] font-medium text-ripple-muted-foreground', className)}
>
  {#if isToggle}
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onclick={toggle}
      class="-mx-1 flex h-6 min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-md px-1 text-left outline-none transition-colors duration-150 ease-ripple-out hover:text-ripple-surface-foreground focus-visible:ring-2 focus-visible:ring-ripple-ring/60"
    >
      {@render body()}
    </button>
  {:else}
    <div class="flex min-w-0 flex-1 items-center gap-1">{@render body()}</div>
  {/if}
  {#if action}
    <div class="flex shrink-0 items-center">{@render action()}</div>
  {/if}
</div>
