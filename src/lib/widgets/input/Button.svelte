<script lang="ts">
  import type { Snippet } from 'svelte';
  import { tv } from 'tailwind-variants';
  import { Loader2 } from '@lucide/svelte';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    children?: Snippet;
    hasChildren?: boolean;
    leading?: Snippet;
    trailing?: Snippet;
    variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
    form?: string;
    name?: string;
    value?: string;
    'aria-label'?: string;
    onclick?: (e?: MouseEvent) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    children,
    hasChildren = false,
    leading,
    trailing,
    variant = 'default',
    size = 'md',
    type = 'button',
    disabled = false,
    loading = false,
    form,
    name,
    value,
    'aria-label': ariaLabel,
    onclick,
  }: Props = $props();

  const button = tv({
    base: 'inline-flex items-center justify-center gap-1.5 rounded-[8px] font-medium whitespace-nowrap select-none transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-border bg-transparent text-foreground hover:bg-muted',
        ghost: 'bg-transparent text-foreground hover:bg-muted',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline px-0',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-5 text-[15px]',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  });

  const isDisabled = $derived(disabled || loading);
  const state = $derived(loading ? 'loading' : disabled ? 'disabled' : 'idle');

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined,
  );

  const iconSize = $derived(size === 'sm' ? 14 : size === 'lg' ? 18 : 16);

  function handleClick(e: MouseEvent) {
    if (isDisabled) return;
    onclick?.(e);
  }
</script>

<button
  {id}
  {type}
  {form}
  {name}
  {value}
  class={cn(button({ variant, size }), className)}
  style={styleString}
  data-variant={variant}
  data-size={size}
  data-state={state}
  disabled={isDisabled}
  aria-busy={loading ? 'true' : undefined}
  aria-label={ariaLabel}
  onclick={handleClick}
>
  {#if loading}
    <span data-slot="button-spinner" class="inline-flex shrink-0">
      <Loader2 size={iconSize} class="animate-spin" />
    </span>
  {:else if leading}
    <span data-slot="button-leading" class="inline-flex shrink-0">{@render leading()}</span>
  {/if}

  {#if hasChildren && children}
    {@render children()}
  {:else if label}
    <span>{label}</span>
  {/if}

  {#if !loading && trailing}
    <span data-slot="button-trailing" class="inline-flex shrink-0">{@render trailing()}</span>
  {/if}
</button>
