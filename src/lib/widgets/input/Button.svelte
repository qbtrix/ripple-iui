<!--
  Button.svelte — Ripple button widget.
  Updated 2026-06-08 (design polish): modernized every variant while keeping the
  theme tokens + the tv variants/sizes API intact. Solid variants (default/
  primary/destructive) now carry a soft elevation shadow + a 1px inset top
  highlight (via ring) for premium depth instead of reading flat. All variants
  gain a crisp active/pressed state (slight downward nudge + flattened shadow)
  and a clearer focus-visible ring. secondary/outline/ghost are visually
  distinct: secondary is a filled neutral chip, outline a bordered surface with
  a hover lift, ghost a quiet hover-fill. Proportions tightened (taller/roomier
  sizes, consistent radius via --radius token, medium weight, -0.01em tracking).
  Hover/active brightness uses Tailwind opacity layering on the existing tokens
  so light/dark + host theming still drive the actual colors — no hardcoded hex.
-->
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
    variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
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
    base: [
      'inline-flex items-center justify-center gap-2 whitespace-nowrap select-none cursor-pointer',
      'rounded-[var(--radius,0.625rem)] font-medium tracking-[-0.01em] leading-none',
      // Animate color + shadow + transform together so depth + press feel intentional.
      'transition-[background-color,box-shadow,transform,border-color,color] duration-150 ease-out',
      // Clear, theme-driven focus ring (offset so it reads on any surface).
      'outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      // Disabled: quiet + non-interactive, no lingering shadow/transform.
      'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
    ],
    variants: {
      variant: {
        // Solid: soft elevation + a 1px inset top highlight (inset ring) for premium depth.
        default:
          'bg-primary text-primary-foreground shadow-sm ring-1 ring-inset ring-white/10 hover:bg-primary/92 hover:shadow active:bg-primary/95 active:shadow-xs active:translate-y-px',
        primary:
          'bg-primary text-primary-foreground shadow-sm ring-1 ring-inset ring-white/10 hover:bg-primary/92 hover:shadow active:bg-primary/95 active:shadow-xs active:translate-y-px',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm ring-1 ring-inset ring-white/12 hover:bg-destructive/92 hover:shadow active:bg-destructive/95 active:shadow-xs active:translate-y-px',
        // Secondary: filled neutral chip — a real button, not flat gray.
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/75 active:bg-secondary/85 active:translate-y-px',
        // Outline: bordered surface that lifts on hover.
        outline:
          'border border-border bg-background text-foreground shadow-xs hover:bg-muted hover:border-border/80 hover:shadow-sm active:bg-muted active:shadow-xs active:translate-y-px',
        // Ghost: quiet until hovered — clearly a control, not naked text.
        ghost:
          'bg-transparent text-foreground hover:bg-muted active:bg-muted/80 active:translate-y-px',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-6 text-[15px]',
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
