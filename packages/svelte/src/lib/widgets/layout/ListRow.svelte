<!--
  src/lib/widgets/layout/ListRow.svelte
  NEW 2026-09-25 (shell new-look slice 1). The sidebar / nav row the app shell
  hand-rolls today in FusionSidebar, the chat dock's SessionList and the
  settings nav column. On `./ui` only: no spec-registry entry, no manifest
  entry, so the manifest count does not move.

  Shape. A wrapper <div> paints the row (height, hover, active fill) and holds
  two siblings: the host element (<a href> when `href` is set, otherwise
  <button type=button>) and the `trailing` actions. The actions are never
  inside the host, because interactive content inside a button or anchor is
  invalid and breaks tabbing. They fade in on hover and stay visible while
  focus is anywhere in the row (group-focus-within), so a keyboard user sees
  what they tab into. On the `touch` size they are always visible. While they
  show, the meta text and the unread dot/count fade out under them.

  Forwarding. Every prop the component does not name (aria-*, data-*,
  draggable, oncontextmenu, drag events, onkeydown, style) is spread on the
  host element, after the defaults, so the host can override aria-current.
  `class` goes on the wrapper so a host class hook covers the whole row.

  Rename. `renaming` plus a `rename` snippet swaps the host element for a
  plain <div> holding `leading` and the host's input. ListRow owns no rename
  logic; the host supplies the input and its handlers.

  Activation is native: Enter on a button or link, Space on a button.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils.js';

  type Size = 'sm' | 'md' | 'touch';

  interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'onclick' | 'children'> {
    class?: string;
    /** Plain-text label; `children` wins when both are given. */
    label?: string;
    /** Renders an <a href>. Without it the row is a <button type=button>. */
    href?: string;
    onclick?: (e: MouseEvent) => void;
    active?: boolean;
    /** `true` shows a dot; a number > 0 shows a count; 0/false show nothing. */
    unread?: boolean | number;
    muted?: boolean;
    /** Nesting level; each level adds 12px of left padding. */
    indent?: number;
    /** sm = 28px, md = 32px, touch = 44px. */
    size?: Size;
    renaming?: boolean;
    leading?: Snippet;
    children?: Snippet;
    meta?: Snippet;
    trailing?: Snippet;
    rename?: Snippet;
  }

  let {
    class: className,
    label,
    href,
    onclick,
    active = false,
    unread = false,
    muted = false,
    indent,
    size = 'md',
    renaming = false,
    leading,
    children,
    meta,
    trailing,
    rename,
    ...rest
  }: Props = $props();

  const heightClass = $derived(size === 'sm' ? 'h-7' : size === 'touch' ? 'h-11 text-[15px]' : 'h-8');
  const count = $derived(typeof unread === 'number' && unread > 0 ? unread : 0);
  const dot = $derived(unread === true);
  // Under the overlaid trailing actions, meta and the unread mark fade out.
  const underTrailing = $derived(
    trailing && size !== 'touch' ? 'group-hover/row:opacity-0 group-focus-within/row:opacity-0' : ''
  );
  const padClass = 'pl-[calc(0.5rem_+_var(--list-row-indent,0)_*_0.75rem)] pr-2';
</script>

<div
  data-list-row
  data-active={active || undefined}
  data-muted={muted || undefined}
  class={cn(
    'group/row relative flex min-w-0 items-center rounded-md text-[13px] transition-colors duration-150 ease-ripple-out',
    heightClass,
    active
      ? 'bg-ripple-accent/15 text-ripple-surface-foreground'
      : 'text-ripple-surface-foreground hover:bg-ripple-accent/10',
    muted && !active && 'text-ripple-muted-foreground',
    className
  )}
  style={indent != null ? `--list-row-indent: ${indent}` : undefined}
>
  {#if renaming && rename}
    <div data-list-row-rename class={cn('flex h-full min-w-0 flex-1 items-center gap-2', padClass)}>
      {#if leading}<span class="flex shrink-0 items-center">{@render leading()}</span>{/if}
      <span class="min-w-0 flex-1">{@render rename()}</span>
    </div>
  {:else}
    <svelte:element
      this={href ? 'a' : 'button'}
      data-list-row-host
      type={href ? undefined : 'button'}
      {href}
      {onclick}
      aria-current={active ? (href ? 'page' : 'true') : undefined}
      class={cn(
        'flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ripple-ring/60',
        padClass
      )}
      {...rest}
    >
      {#if leading}<span class="flex shrink-0 items-center">{@render leading()}</span>{/if}
      <span data-list-row-label class={cn('min-w-0 flex-1 truncate', (dot || count > 0) && 'font-medium')}>
        {#if children}{@render children()}{:else}{label}{/if}
      </span>
      {#if meta}
        <span
          class={cn(
            'shrink-0 text-[12px] tabular-nums text-ripple-muted-foreground',
            underTrailing
          )}>{@render meta()}</span
        >
      {/if}
      {#if count > 0}
        <span
          data-unread-count
          class={cn(
            'inline-flex h-[1.125rem] min-w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-ripple-accent px-1 text-[11px] font-medium leading-none tabular-nums text-ripple-accent-foreground',
            underTrailing
          )}
          >{count}</span
        >
      {:else if dot}
        <span data-unread-dot class={cn('size-1.5 shrink-0 rounded-full bg-ripple-accent', underTrailing)} aria-hidden="true"></span>
        <span class="sr-only">Unread</span>
      {/if}
    </svelte:element>
    {#if trailing}
      <div
        data-list-row-trailing
        class={cn(
          'flex shrink-0 items-center gap-0.5 pr-1 transition-opacity duration-150 ease-ripple-out',
          size === 'touch'
            ? 'opacity-100'
            : 'absolute inset-y-0 right-0 opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100'
        )}
      >
        {@render trailing()}
      </div>
    {/if}
  {/if}
</div>
