<!-- Updated 2026-07-08: typed getIcon's Lucide lookup as a Svelte Component (was unknown → narrowed to {} at the render slot, failing svelte-check).
  2026-09-17 (fix/port-gaps): status-coloured text moved onto the readable
  text tokens (text-ripple-{error,success,warning,info}-text; red text that
  read text-destructive now reads text-ripple-error-text, the same hue since
  --ripple-error aliases --destructive). The raw tones are fill colours and
  measured 1.7-3.3:1 as text in light mode. Fills and tints are unchanged.
  Same day, destructive label: the action button darkens its red toward black
  (scoped .ripple-error-action, 78% rest / 70% hover) so the white label clears
  4.5:1; raw --destructive measured 3.59:1 light and 2.89:1 dark. The host token
  is untouched.
-->
<!-- src/lib/widgets/overlay/ErrorState.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import * as icons from '@lucide/svelte';
  import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    description?: string;
    icon?: string;
    /** Primary action label. */
    actionLabel?: string;
    /** Secondary action label. */
    secondaryLabel?: string;
    /** Optional error code / detail (small monospace). */
    detail?: string;
    onaction?: () => void;
    onsecondary?: () => void;
  }

  let {
    id,
    class: className,
    style,
    title = 'Something went wrong',
    description = 'We hit an unexpected error while loading this view.',
    icon,
    actionLabel = 'Try again',
    secondaryLabel,
    detail,
    onaction,
    onsecondary
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function getIcon(name?: string) {
    if (!name) return null;
    const camel = name
      .split('-')
      .map((p) => (p[0]?.toUpperCase() ?? '') + p.slice(1))
      .join('');
    return ((icons as unknown) as Record<string, import('svelte').Component<any, any, any>>)[camel] ?? null;
  }

  const Icon = $derived(getIcon(icon) ?? AlertTriangleIcon);
</script>

<div
  {id}
  role="alert"
  class={cn(
    'flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-8 text-center',
    className
  )}
  style={styleString}
>
  <span class="grid place-items-center h-12 w-12 rounded-full bg-destructive/10 text-ripple-error-text">
    <Icon size={20} />
  </span>
  <div class="flex flex-col gap-1 max-w-md">
    <h3 class="text-base font-semibold">{title}</h3>
    {#if description}
      <p class="text-sm text-muted-foreground">{description}</p>
    {/if}
  </div>

  {#if detail}
    <pre class="rounded-md bg-muted/40 px-3 py-1.5 text-xs font-mono text-muted-foreground max-w-md whitespace-pre-wrap break-all">{detail}</pre>
  {/if}

  {#if actionLabel || secondaryLabel}
    <div class="flex items-center gap-2 mt-1">
      {#if secondaryLabel}
        <button
          type="button"
          onclick={() => onsecondary?.()}
          class="inline-flex items-center justify-center h-9 px-3 rounded-md border border-border text-sm font-medium hover:bg-muted/60 transition-colors"
        >
          {secondaryLabel}
        </button>
      {/if}
      {#if actionLabel}
        <button
          type="button"
          onclick={() => onaction?.()}
          class="inline-flex items-center justify-center h-9 px-3 rounded-md bg-destructive text-destructive-foreground text-sm font-medium transition-colors ripple-error-action"
        >
          {actionLabel}
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* The host red deepened toward black so the white label reads at 4.5:1 in
     both themes; the hover state steps darker still. */
  .ripple-error-action {
    background-color: color-mix(in oklab, var(--destructive) 78%, black);
  }
  .ripple-error-action:hover {
    background-color: color-mix(in oklab, var(--destructive) 70%, black);
  }
</style>
