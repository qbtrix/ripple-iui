<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  import * as Card from '../../components/ui/card/index.js';

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

  const variantClass = $derived({
    'default': '',
    'selected': 'ring-2 ring-primary',
    'muted': 'bg-muted'
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
</style>
