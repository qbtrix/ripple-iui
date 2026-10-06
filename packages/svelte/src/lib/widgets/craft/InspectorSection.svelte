<!--
  widgets/craft/InspectorSection.svelte
  A titled group of inspector rows (Transform, Fill, Text …) for a dense side
  panel. On `./ui` only. The title is a 12px semibold sentence-case label on the
  same left edge as PropertyRow's labels (px-3), the disclosure chevron sits at
  the right, and sections are divided by a hairline, so a stack of sections
  reads as calm bands with a clear hierarchy: section title > row label.
  `open` is bindable; `collapsible={false}` renders a plain heading. `meta` is a
  muted note after the title (the selection's kind, a count). `actions` sits at
  the right of the header (an add button) and never toggles the section.
  Tokens only.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

  interface Props {
    title: string;
    open?: boolean;
    collapsible?: boolean;
    /** Muted text after the title, e.g. the selected object's kind. */
    meta?: string;
    actions?: Snippet;
    children?: Snippet;
    class?: string;
  }

  let { title, open = $bindable(true), collapsible = true, meta, actions, children, class: className }: Props = $props();
  const shown = $derived(!collapsible || open);
</script>

{#snippet heading()}
  <span class="truncate text-[12px] font-semibold text-ripple-surface-foreground">{title}</span>
  {#if meta}<span class="truncate text-[11px] text-ripple-muted-foreground">{meta}</span>{/if}
{/snippet}

<section data-slot="inspector-section" class={cn('border-b border-ripple-border/70 pb-2 last:border-b-0', className)}>
  <div class="flex h-9 items-center gap-1 pl-3 pr-1.5">
    {#if collapsible}
      <button
        type="button"
        aria-expanded={open}
        onclick={() => (open = !open)}
        class="group/sec flex h-7 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ripple-ring/60"
      >
        {@render heading()}
        <ChevronDownIcon
          size={13}
          class={cn(
            'ml-auto mr-1 shrink-0 text-ripple-muted-foreground opacity-60 transition-[transform,opacity] duration-150 ease-ripple-out group-hover/sec:opacity-100',
            !open && '-rotate-90'
          )}
        />
      </button>
    {:else}
      <h3 class="flex min-w-0 flex-1 items-center gap-2">{@render heading()}</h3>
    {/if}
    {#if actions}<div class="flex shrink-0 items-center gap-0.5">{@render actions()}</div>{/if}
  </div>
  {#if shown}
    <div class="flex flex-col gap-1">{@render children?.()}</div>
  {/if}
</section>
