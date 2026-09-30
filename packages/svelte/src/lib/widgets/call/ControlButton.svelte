<!--
  ControlButton.svelte — one call control (mic, camera, share, chat, hang-up).
  NEW 2026-09-30 (call UI new look, slice 0).

  A native <button type=button>; every other attribute (aria-label, title,
  data-testid, onclick, disabled …) is forwarded as-is. `pressed` maps to
  aria-pressed "true"/"false" and is omitted when undefined, so a plain action
  (hang-up, invite) is not announced as a toggle.

  Looks, one per call layout:
    classic — round 48px key on a soft fill (today's look)
    pill    — transparent round key, sized to sit inside a glass ControlBar
    bar     — rounded-rect key with an optional text `label` beside the icon;
              the label hides under 640px so a phone keeps an icon row
  tone: default | danger (solid error fill) | accent (lit: tinted accent in
  pill/bar, solid accent in classic). size: default | compact (36px, for the
  dock and PiP). A hang-up is tone="danger" plus `wide` (a longer key in each
  look). Width lives in this scoped CSS, which beats a Tailwind width class, so
  use `wide` (or restyle via :global) rather than w-* utilities.

  `count` / `mention` paint a CountBadge on the corner; `badgeTestId` names it.
  Accent text on glass reads `--ripple-accent-on-glass` when the host sets one
  and falls back to `--ripple-accent`. Tokens only, no colour literals.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils.js';
  import CountBadge from './CountBadge.svelte';

  type Props = Omit<HTMLButtonAttributes, 'children'> & {
    pressed?: boolean;
    tone?: 'default' | 'danger' | 'accent';
    size?: 'default' | 'compact';
    variant?: 'pill' | 'bar' | 'classic';
    /** A longer key (hang-up). */
    wide?: boolean;
    /** Visible text beside the icon, bar variant only. Keep aria-label for the name. */
    label?: string;
    icon?: Snippet;
    children?: Snippet;
    count?: number;
    mention?: boolean;
    badgeTestId?: string;
  };

  let {
    pressed,
    tone = 'default',
    size = 'default',
    variant = 'classic',
    wide = false,
    label,
    icon,
    children,
    count = 0,
    mention = false,
    badgeTestId,
    class: className,
    type = 'button',
    ...rest
  }: Props = $props();
</script>

<button
  {type}
  class={cn('ripple-ctl', className)}
  data-slot="control-button"
  data-tone={tone}
  data-size={size}
  data-variant={variant}
  data-wide={wide ? '' : undefined}
  aria-pressed={pressed === undefined ? undefined : pressed ? 'true' : 'false'}
  {...rest}
>
  {#if icon}<span data-slot="control-icon" class="ripple-ctl-icon">{@render icon()}</span>{/if}
  {#if variant === 'bar' && label}<span data-slot="control-label" class="ripple-ctl-label">{label}</span>{/if}
  {@render children?.()}
  <CountBadge {count} {mention} data-testid={badgeTestId} />
</button>

<style>
  .ripple-ctl {
    position: relative;
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    width: 3rem;
    height: 3rem;
    padding: 0;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    color: var(--ripple-surface-foreground);
    background: color-mix(in oklch, var(--ripple-surface-foreground) 12%, transparent);
    transition:
      background-color 150ms var(--ripple-ease-out),
      color 150ms var(--ripple-ease-out),
      transform 150ms var(--ripple-ease-out);
    outline: none;
  }
  .ripple-ctl:hover:not(:disabled) {
    background: color-mix(in oklch, var(--ripple-surface-foreground) 20%, transparent);
  }
  .ripple-ctl:active:not(:disabled) {
    transform: scale(0.96);
  }
  .ripple-ctl:focus-visible {
    box-shadow: 0 0 0 2px var(--ripple-ring);
  }
  .ripple-ctl:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  .ripple-ctl-icon {
    display: inline-flex;
  }
  .ripple-ctl-icon :global(svg) {
    width: 1.25rem;
    height: 1.25rem;
  }
  .ripple-ctl-label {
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
  }

  /* tones (classic is the base) */
  .ripple-ctl[data-tone='accent'] {
    color: var(--ripple-accent-foreground);
    background: var(--ripple-accent);
  }
  .ripple-ctl[data-tone='danger'],
  .ripple-ctl[data-tone='danger']:hover:not(:disabled) {
    color: var(--ripple-error-foreground);
    background: var(--ripple-error);
  }

  /* pill — transparent keys inside the glass capsule */
  .ripple-ctl[data-variant='pill'] {
    width: 2.75rem;
    height: 2.75rem;
  }
  .ripple-ctl[data-variant='pill']:not([data-tone='danger']):not([data-tone='accent']) {
    background: transparent;
  }
  .ripple-ctl[data-variant='pill']:not([data-tone='danger']):hover:not(:disabled) {
    background: color-mix(in oklch, var(--ripple-surface-foreground) 14%, transparent);
  }

  /* bar — slim rounded keys with a word beside the icon */
  .ripple-ctl[data-variant='bar'] {
    width: auto;
    min-width: 2.5rem;
    height: 2.5rem;
    padding-inline: 0.75rem;
    border-radius: 0.5rem;
  }
  .ripple-ctl[data-variant='bar']:not([data-tone='danger']):not([data-tone='accent']) {
    background: transparent;
  }
  .ripple-ctl[data-variant='bar']:not([data-tone='danger']):hover:not(:disabled) {
    background: color-mix(in oklch, var(--ripple-surface-foreground) 12%, transparent);
  }

  /* lit accent on glass: a tint, not a slab */
  .ripple-ctl[data-variant='pill'][data-tone='accent'],
  .ripple-ctl[data-variant='bar'][data-tone='accent'] {
    color: var(--ripple-accent-on-glass, var(--ripple-accent));
    background: color-mix(in oklch, var(--ripple-accent) 20%, transparent);
  }

  /* wide — the hang-up key */
  .ripple-ctl[data-wide] {
    width: 3.5rem;
  }
  .ripple-ctl[data-variant='pill'][data-wide] {
    width: 4rem;
  }
  .ripple-ctl[data-variant='bar'][data-wide] {
    width: auto;
    padding-inline: 1rem;
  }

  /* compact — dock / PiP */
  .ripple-ctl[data-size='compact'] {
    width: 2.25rem;
    height: 2.25rem;
    min-width: 0;
    padding: 0;
    border-radius: 999px;
  }
  .ripple-ctl[data-size='compact'][data-wide] {
    width: 2.75rem;
  }
  .ripple-ctl[data-size='compact'] .ripple-ctl-icon :global(svg) {
    width: 1rem;
    height: 1rem;
  }
  .ripple-ctl[data-size='compact'] .ripple-ctl-label {
    display: none;
  }

  @media (max-width: 640px) {
    .ripple-ctl:not([data-size='compact']) {
      width: 2.5rem;
      height: 2.5rem;
    }
    .ripple-ctl[data-variant='bar']:not([data-size='compact']) {
      padding: 0;
    }
    .ripple-ctl-label {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ripple-ctl,
    .ripple-ctl:active:not(:disabled) {
      transform: none;
      transition: none;
    }
  }
</style>
