<script lang="ts">
  import type { Snippet } from 'svelte';
  import { tv } from 'tailwind-variants';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    description?: string;
    header?: Snippet;
    footer?: Snippet;
    children?: Snippet;
    hasChildren?: boolean;
    variant?: 'default' | 'muted' | 'outlined' | 'selected' | 'glass';
    density?: 'comfortable' | 'compact';
    interactive?: boolean;
    onclick?: (e?: unknown) => void;
  }

  let {
    id,
    class: className,
    style,
    title,
    description,
    header,
    footer,
    children,
    hasChildren = false,
    variant = 'default',
    density = 'compact',
    interactive = false,
    onclick,
  }: Props = $props();

  const card = tv({
    base: 'relative flex flex-col rounded-ripple bg-ripple-surface text-ripple-surface-foreground transition-colors',
    variants: {
      variant: {
        default: 'border border-ripple-border',
        muted: 'border border-ripple-border bg-ripple-muted',
        outlined: 'border border-foreground/15',
        selected: 'border border-ripple-border ring-1 ring-inset ring-ripple-accent',
        glass: 'border border-white/10 bg-black/40 backdrop-blur-md backdrop-saturate-150',
      },
      density: {
        compact: 'gap-2 p-4',
        comfortable: 'gap-3 p-5',
      },
      interactive: {
        true: 'cursor-pointer hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      density: 'compact',
      interactive: false,
    },
  });

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined,
  );

  const isInteractive = $derived(interactive && typeof onclick === 'function');
  const showHeader = $derived(Boolean(title || description || header));

  function onKeydown(e: KeyboardEvent) {
    if (!isInteractive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onclick?.(e);
    }
  }
</script>

<svelte:element
  this={isInteractive ? 'button' : 'div'}
  type={isInteractive ? 'button' : undefined}
  {id}
  class={cn(card({ variant, density, interactive: isInteractive }), className)}
  style={styleString}
  data-variant={variant}
  data-density={density}
  role={isInteractive ? 'button' : undefined}
  tabindex={isInteractive ? 0 : undefined}
  aria-pressed={isInteractive && variant === 'selected' ? 'true' : undefined}
  onclick={isInteractive ? onclick : undefined}
  onkeydown={isInteractive ? onKeydown : undefined}
>
  {#if showHeader}
    <div data-slot="card-header" class="flex items-start justify-between gap-4">
      {#if title || description}
        <div class="flex flex-col gap-[2px] min-w-0">
          {#if title}
            <div class="text-[14px] font-semibold leading-tight truncate">{title}</div>
          {/if}
          {#if description}
            <div class="text-[13px] font-normal text-muted-foreground leading-snug">
              {description}
            </div>
          {/if}
        </div>
      {/if}
      {#if header}
        <div class="shrink-0">{@render header()}</div>
      {/if}
    </div>
  {/if}

  {#if hasChildren || children}
    <div data-slot="card-body" class="min-w-0">
      {@render children?.()}
    </div>
  {/if}

  {#if footer}
    <div data-slot="card-footer" class="mt-auto pt-2 border-t border-ripple-border/60">
      {@render footer()}
    </div>
  {/if}
</svelte:element>
