<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title: string;
    subtitle?: string;
    /** Optional eyebrow text shown above the title (small, uppercase). */
    eyebrow?: string;
    /** Slot for action buttons rendered on the right. Use `slot: "actions"`. */
    actions?: Snippet;
    /** Default body slot rendered below the header (e.g., breadcrumbs, tabs). */
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style,
    title, subtitle, eyebrow, actions, children, hasChildren = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<header
  {id}
  class={cn('flex flex-col gap-3 border-b border-border pb-4', className)}
  style={styleString}
>
  <div class="flex items-start justify-between gap-4">
    <div class="flex flex-col gap-1 min-w-0">
      {#if eyebrow}
        <span class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</span>
      {/if}
      <h1 class="text-xl font-semibold tracking-tight leading-tight truncate">{title}</h1>
      {#if subtitle}
        <p class="text-sm text-muted-foreground">{subtitle}</p>
      {/if}
    </div>
    {#if actions}
      <div class="flex items-center gap-2 shrink-0">
        {@render actions()}
      </div>
    {/if}
  </div>
  {#if hasChildren && children}
    <div>{@render children()}</div>
  {/if}
</header>
