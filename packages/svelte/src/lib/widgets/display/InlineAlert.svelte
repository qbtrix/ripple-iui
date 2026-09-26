<!--
  src/lib/widgets/display/InlineAlert.svelte
  NEW 2026-09-26 (feature pages canon, F1 / G3). An inline banner/callout for
  feature pages: a failed load above a list, a form error, a warning or a
  success note. Replaces the hand-rolled err-banner / *-error / *-form-error
  blocks. On `./ui` only (no registry or manifest entry, so the count stays
  189). The spec `Alert` widget is unchanged.

  Four tones (info, success, warning, error) on the tone's /10 tint with a /25
  ring. Title and icon use the tone's `-text` token (4.5:1 on its tint, see
  status-text.test.ts); the body uses the surface ink. warning and error are
  role="alert", info and success role="status". `actions` renders a row of
  buttons under the body. `ondismiss` shows a close button; the component does
  not hide itself, the caller owns visibility. Unnamed props (data-*, aria-*)
  are spread on the root.

  Updated 2026-09-27 (canon gaps 2): `role` overrides the tone's default
  live-region role (status|alert), for a warning that should not interrupt
  or a success that should.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { tv } from 'tailwind-variants';
  import InfoIcon from '@lucide/svelte/icons/info';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import XIcon from '@lucide/svelte/icons/x';

  type Tone = 'info' | 'success' | 'warning' | 'error';

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title' | 'role'> {
    class?: string;
    tone?: Tone;
    title?: string;
    description?: string;
    /** Replaces `description` when given. */
    children?: Snippet;
    /** A row of buttons under the body (Retry, Undo, …). */
    actions?: Snippet;
    /** Shows a dismiss button when set. */
    ondismiss?: () => void;
    /** aria-label for the dismiss button. */
    dismissLabel?: string;
    /** Overrides the tone's default role (warning/error: alert, else status). */
    role?: 'status' | 'alert';
  }

  let {
    class: className,
    tone = 'info',
    title,
    description,
    children,
    actions,
    ondismiss,
    dismissLabel = 'Dismiss',
    role,
    ...rest
  }: Props = $props();

  const inlineAlert = tv({
    slots: {
      base: 'flex w-full items-start gap-2.5 rounded-ripple px-3 py-2.5 text-[13px] leading-snug ring-1',
      icon: 'mt-px size-4 shrink-0',
      heading: 'font-medium',
    },
    variants: {
      tone: {
        info: { base: 'bg-ripple-info/10 ring-ripple-info/25', icon: 'text-ripple-info-text', heading: 'text-ripple-info-text' },
        success: { base: 'bg-ripple-success/10 ring-ripple-success/25', icon: 'text-ripple-success-text', heading: 'text-ripple-success-text' },
        warning: { base: 'bg-ripple-warning/10 ring-ripple-warning/25', icon: 'text-ripple-warning-text', heading: 'text-ripple-warning-text' },
        error: { base: 'bg-ripple-error/10 ring-ripple-error/25', icon: 'text-ripple-error-text', heading: 'text-ripple-error-text' },
      },
    },
    defaultVariants: { tone: 'info' },
  });

  const s = $derived(inlineAlert({ tone }));
  const Icon = $derived(
    tone === 'success' ? CircleCheckIcon
      : tone === 'warning' ? TriangleAlertIcon
      : tone === 'error' ? CircleAlertIcon
      : InfoIcon
  );
</script>

<div
  {...rest}
  data-inline-alert
  data-tone={tone}
  role={role ?? (tone === 'error' || tone === 'warning' ? 'alert' : 'status')}
  class={s.base({ class: className })}
>
  <Icon aria-hidden="true" class={s.icon()} />
  <div class="min-w-0 flex-1">
    {#if title}<p class={s.heading()}>{title}</p>{/if}
    {#if children}
      <div class="text-ripple-surface-foreground">{@render children()}</div>
    {:else if description}
      <p class="text-ripple-surface-foreground">{description}</p>
    {/if}
    {#if actions}
      <div data-inline-alert-actions class="mt-2 flex flex-wrap items-center gap-2">{@render actions()}</div>
    {/if}
  </div>
  {#if ondismiss}
    <button
      type="button"
      aria-label={dismissLabel}
      onclick={() => ondismiss?.()}
      class="-my-0.5 -mr-1 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-ripple-muted-foreground outline-none transition-colors duration-150 ease-ripple-out hover:bg-ripple-accent/10 hover:text-ripple-surface-foreground focus-visible:ring-2 focus-visible:ring-ripple-ring/60"
    >
      <XIcon size={14} />
    </button>
  {/if}
</div>
