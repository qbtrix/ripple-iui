<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Card from '$lib/components/ui/card/index.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    children?: Snippet;
    title?: string;
    description?: string;
    variant?: 'default' | 'selected' | 'muted' | 'glass';
    onclick?: (e?: unknown) => void;
  }

  let {
    id, class: className, style, children, title, description,
    variant = 'default', onclick
  }: Props = $props();

  const variantClass = $derived({
    'default': '',
    'selected': 'ring-2 ring-primary',
    'muted': 'bg-muted',
    'glass': 'rcard--glass'
  }[variant]);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<Card.Root {id} class={cn('rcard', variantClass, className)} style={styleString} onclick={onclick}>
  {#if title || description}
    <Card.Header>
      {#if title}
        <Card.Title>{title}</Card.Title>
      {/if}
      {#if description}
        <Card.Description>{description}</Card.Description>
      {/if}
    </Card.Header>
  {/if}
  <Card.Content>
    {@render children?.()}
  </Card.Content>
</Card.Root>

<style>
  :global(.rcard) {
    flex: 1 1 0%;
    min-width: 0;
    overflow: hidden;
  }
  :global(.rcard--glass) {
    background: color-mix(in srgb, #000 38%, transparent) !important;
    backdrop-filter: blur(8px) saturate(150%);
    -webkit-backdrop-filter: blur(8px) saturate(150%);
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, #fff 10%, transparent),
      inset 2px 1px 0px -1px color-mix(in srgb, #fff 30%, transparent),
      inset -1.5px -1px 0px -1px color-mix(in srgb, #fff 20%, transparent),
      0px 3px 10px 0px color-mix(in srgb, #000 12%, transparent);
    ring: none !important;
  }
</style>
