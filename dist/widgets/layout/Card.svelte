<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

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
<div
  {id}
  class={cn('ripple-card', variant !== 'default' && `ripple-card--${variant}`, className)}
  style={styleString}
  data-variant={variant}
  {onclick}
>
  {#if title || description}
    <div class="ripple-card-header">
      {#if title}<div class="ripple-card-title">{title}</div>{/if}
      {#if description}<div class="ripple-card-description">{description}</div>{/if}
    </div>
  {/if}
  <div class="ripple-card-content">
    {@render children?.()}
  </div>
</div>
