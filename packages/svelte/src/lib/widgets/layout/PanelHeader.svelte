<!--
  src/lib/widgets/layout/PanelHeader.svelte
  NEW 2026-09-25 (shell new-look slice 1). The header row of a side panel
  (thread, artifact, details): optional leading snippet (a back button or an
  icon), a title with an optional subtitle, an actions snippet, and a close
  button when `onclose` is set. On `./ui` only (no registry or manifest
  entry). `PageHeader` stays the spec widget for full pages.

  Quiet chrome: a hairline bottom border, the 13px/12px type rhythm, ghost
  icon buttons with the accent/10 hover. Unnamed props (data-*, aria-*,
  handlers) are spread on the <header>.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils.js';
  import XIcon from '@lucide/svelte/icons/x';

  interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title'> {
    class?: string;
    title?: string;
    subtitle?: string;
    onclose?: () => void;
    /** aria-label for the close button. */
    closeLabel?: string;
    leading?: Snippet;
    actions?: Snippet;
    /** Replaces `title` when given. */
    children?: Snippet;
  }

  let {
    class: className,
    title,
    subtitle,
    onclose,
    closeLabel = 'Close',
    leading,
    actions,
    children,
    ...rest
  }: Props = $props();
</script>

<header
  {...rest}
  class={cn('flex min-h-11 shrink-0 items-center gap-2 border-b border-ripple-border px-3 py-1.5', className)}
>
  {#if leading}<div class="flex shrink-0 items-center">{@render leading()}</div>{/if}
  <div class="min-w-0 flex-1">
    <h2 class="truncate text-[13px] font-medium leading-tight text-ripple-surface-foreground">
      {#if children}{@render children()}{:else}{title}{/if}
    </h2>
    {#if subtitle}
      <p class="truncate text-[12px] leading-tight text-ripple-muted-foreground">{subtitle}</p>
    {/if}
  </div>
  {#if actions}<div class="flex shrink-0 items-center gap-0.5">{@render actions()}</div>{/if}
  {#if onclose}
    <button
      type="button"
      aria-label={closeLabel}
      onclick={() => onclose?.()}
      class="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-ripple-muted-foreground outline-none transition-colors duration-150 ease-ripple-out hover:bg-ripple-accent/10 hover:text-ripple-surface-foreground focus-visible:ring-2 focus-visible:ring-ripple-ring/60"
    >
      <XIcon size={14} />
    </button>
  {/if}
</header>
