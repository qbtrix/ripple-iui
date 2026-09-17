<!--
  ItemCard.svelte — RIPPLE-NATIVE molecule (Wave 1: molecules).
  Created 2026-06-07.
  Adapted from ocean-flow's molecules/ItemCard.svelte. Rewired off genesis/
  shadcn imports onto RIPPLE widgets: display/Image, display/Icon,
  display/Badge, input/Rating, plus the new PriceTag + SelectionIndicator
  molecules. Styled with ripple design tokens (ripple-surface / ripple-border /
  ripple-accent) and Tailwind utilities.

  The workhorse selectable card: image-or-icon + title + subtitle + description
  + badge + price + rating + selection state, with layout hints. Reused by the
  browse / select / detail layouts in later waves. Pure presentation — props in,
  UI out; the only event is an optional `onclick`. No data fetching, no services.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Image from '$lib/widgets/display/Image.svelte';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import Badge from '$lib/widgets/display/Badge.svelte';
  import Rating from '$lib/widgets/input/Rating.svelte';
  import PriceTag from './PriceTag.svelte';
  import SelectionIndicator from './SelectionIndicator.svelte';

  interface Props {
    // Required
    title: string;

    // Optional content
    subtitle?: string;
    description?: string;
    image?: string;
    /** Lucide icon slug (kebab-case), shown when no image is available. */
    icon?: string;
    badge?: string;
    location?: string;

    // Metadata
    price?: string | number;
    originalPrice?: string | number;
    rating?: number;

    // State
    selected?: boolean;
    showSelection?: boolean;
    /** 'single' → radio dot, 'multiple' → check (passed to SelectionIndicator). */
    selectionMode?: 'single' | 'multiple';

    // Layout hints
    showImage?: boolean;
    showPrice?: boolean;
    compact?: boolean;

    // Events
    onclick?: (e?: unknown) => void;

    id?: string;
    class?: string;
  }

  let {
    title,
    subtitle,
    description,
    image,
    icon,
    badge,
    location,
    price,
    originalPrice,
    rating,
    selected = false,
    showSelection = false,
    selectionMode = 'multiple',
    showImage = true,
    showPrice = true,
    compact = false,
    onclick,
    id,
    class: className,
  }: Props = $props();

  const isValidUrl = $derived(
    typeof image === 'string' && /^(https?:)?\/\//.test(image),
  );
  const hasImage = $derived(showImage && Boolean(image) && isValidUrl);
  const hasIcon = $derived(!hasImage && Boolean(icon));
  const hasMetadata = $derived(Boolean(rating) || (showPrice && price != null));

  const isInteractive = $derived(typeof onclick === 'function');

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
  role={isInteractive ? 'button' : undefined}
  tabindex={isInteractive ? 0 : undefined}
  aria-pressed={isInteractive ? selected : undefined}
  onclick={isInteractive ? onclick : undefined}
  onkeydown={isInteractive ? onKeydown : undefined}
  class={cn(
    'group relative flex w-full flex-col overflow-hidden rounded-ripple border bg-ripple-surface text-left text-ripple-surface-foreground transition-all duration-300',
    isInteractive && 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    selected
      ? 'border-ripple-accent shadow-md ring-1 ring-inset ring-ripple-accent/30'
      : 'border-ripple-border/70',
    isInteractive && !selected && 'hover:-translate-y-0.5 hover:border-ripple-accent/50 hover:shadow-lg',
    className,
  )}
>
  <!-- Image -->
  {#if hasImage}
    <div class="relative aspect-[4/3] w-full overflow-hidden bg-ripple-muted">
      <Image
        src={image}
        alt={title}
        fit="cover"
        rounded="none"
        class="h-full w-full transition-transform duration-500 will-change-transform group-hover:scale-105"
      />
      {#if badge}
        <div
          class="absolute left-2 top-2 rounded-full bg-ripple-surface/90 px-2 py-0.5 text-[10px] font-semibold text-ripple-surface-foreground shadow-sm backdrop-blur-md"
        >
          {badge}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Content -->
  <div class={cn('flex flex-1 flex-col', compact ? 'p-3' : 'p-4')}>
    <div class="flex gap-3">
      <!-- Icon (when no image) -->
      {#if hasIcon}
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ripple-accent/10 text-ripple-accent"
        >
          <Icon name={icon ?? ''} size={20} />
        </div>
      {/if}

      <!-- Text + metadata -->
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <h3
              class={cn(
                'truncate font-semibold leading-tight tracking-tight',
                compact ? 'text-sm' : 'text-base',
              )}
            >
              {title}
            </h3>
            {#if subtitle}
              <p class="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
            {/if}
            {#if location}
              <div
                class="mt-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground/80"
              >
                <Icon name="map-pin" size={12} class="shrink-0" />
                <span class="truncate">{location}</span>
              </div>
            {/if}
            {#if badge && !hasImage}
              <div class="mt-2">
                <Badge text={badge} variant="secondary" />
              </div>
            {/if}
          </div>

          {#if showSelection}
            <SelectionIndicator {selected} mode={selectionMode} />
          {/if}
        </div>

        {#if description && !compact}
          <p class="mt-2 line-clamp-2 text-xs text-muted-foreground/80">
            {description}
          </p>
        {/if}

        {#if hasMetadata}
          <div
            class="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-ripple-border/50 pt-3"
          >
            {#if rating}
              <Rating value={rating} size="sm" />
            {/if}
            {#if showPrice && price != null}
              <PriceTag
                {price}
                {originalPrice}
                size={compact ? 'sm' : 'md'}
                class={cn('min-w-0 max-w-full', rating ? 'ml-auto' : '')}
              />
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</svelte:element>
