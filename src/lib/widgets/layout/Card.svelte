<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    children?: Snippet;
    title?: string;
    description?: string;
    variant?: 'default' | 'selected' | 'muted';
    onclick?: (e?: unknown) => void;
  }

  let {
    id, class: className, style, children, title, description,
    variant = 'default', onclick
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div {id} class="rcard rcard--{variant} {className ?? ''}" style={styleString} {onclick}>
  {#if title || description}
    <div class="rcard-hd">
      {#if title}<div class="rcard-title">{title}</div>{/if}
      {#if description}<div class="rcard-desc">{description}</div>{/if}
    </div>
  {/if}
  <div class="rcard-body">{@render children?.()}</div>
</div>

<style>
  .rcard {
    border-radius: 8px;
    background: var(--ripple-surface);
    border: 1px solid var(--ripple-border);
    overflow: hidden;
  }
  .rcard--selected { border-color: var(--ripple-info); }
  .rcard--muted { opacity: 0.6; }
  .rcard-hd { padding: 8px 10px 4px; }
  .rcard-title {
    font-size: 10px; font-weight: 600; color: var(--ripple-text-muted);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .rcard-desc { font-size: 11px; color: var(--ripple-text-secondary); margin-top: 2px; }
  .rcard-body { padding: 4px 10px 8px; }
</style>
