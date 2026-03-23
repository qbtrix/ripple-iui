<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    children?: Snippet;
    hasChildren?: boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    disabled?: boolean;
    onclick?: () => void;
  }

  let {
    id, class: className, style, label, children, hasChildren = false,
    variant = 'default', size = 'default', disabled = false, onclick
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<button
  {id} {disabled}
  class={cn('ripple-button', `ripple-button--${variant}`, `ripple-button--${size}`, className)}
  style={styleString} data-variant={variant} data-size={size}
  onclick={onclick}
>
  {#if hasChildren}{@render children?.()}{:else}{label || 'Button'}{/if}
</button>
