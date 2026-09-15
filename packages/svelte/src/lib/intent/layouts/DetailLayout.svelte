<!--
  DetailLayout.svelte — designed single-item detail layout for intent='detail' (Wave 3: layouts).
  Created 2026-06-07.
  Adapted from ocean-flow's DetailLayout, rewired off shadcn Button/IconWidget onto
  RIPPLE display widgets (Image, Heading, Text, Badge, Icon) + the Button widget and
  PriceTag molecule. Renders a hero (image + overlaid title) when an image is
  available, else a clean text header. Meta row (rating / location), description,
  extra fields, price, and the optional action button compose ripple widgets only.

  PURE: reads only the adapter's `input` (first item). Selection / actions surface
  via callbacks the host owns; no fetch, no service.
-->
<script lang="ts">
  import Image from '$lib/widgets/display/Image.svelte';
  import Heading from '$lib/widgets/display/Heading.svelte';
  import Text from '$lib/widgets/display/Text.svelte';
  import Badge from '$lib/widgets/display/Badge.svelte';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import Button from '$lib/widgets/input/Button.svelte';
  import PriceTag from '$lib/molecules/PriceTag.svelte';
  import EmptyState from '$lib/widgets/display/EmptyState.svelte';
  import type { LayoutInput } from '../layout-adapter.js';

  interface Props {
    input: LayoutInput;
    /** Primary action button label (default 'Select'). */
    actionLabel?: string;
    /** Fired when the primary action button is pressed. */
    onAction?: (item: Record<string, unknown>) => void;
  }

  let { input, actionLabel, onAction }: Props = $props();

  const fields = $derived(input.fields);
  const item = $derived(input.items[0] ?? {});
  const meta = $derived(input.meta);

  function field(key: string): unknown {
    const mapped = fields[key];
    return mapped ? item[mapped] : undefined;
  }
  function asString(v: unknown): string | undefined {
    return v == null ? undefined : String(v);
  }
  function isUrl(v: unknown): boolean {
    return typeof v === 'string' && /^(https?:)?\/\//.test(v);
  }

  const image = $derived(meta.showImages ? asString(field('image')) : undefined);
  const hasImage = $derived(Boolean(image) && isUrl(image));
  const title = $derived(asString(field('title')) ?? input.title ?? 'Details');
  const subtitle = $derived(asString(field('subtitle')));
  const description = $derived(asString(field('description')) ?? input.description);
  const badge = $derived(asString(field('badge')));
  const location = $derived(asString(field('location')));
  const rating = $derived(field('rating'));
  const price = $derived(meta.showPrices ? (field('price') as string | number | undefined) : undefined);
  const originalPrice = $derived(field('original_price') as string | number | undefined);
  const label = $derived(actionLabel ?? 'Select');
  const hasItem = $derived(Object.keys(item).length > 0);
</script>

{#if !hasItem}
  <EmptyState title="No details available" description="There's nothing to show here yet." icon="file" />
{:else}
  <div class="overflow-hidden rounded-ripple border border-ripple-border/70 bg-ripple-surface text-ripple-surface-foreground">
    {#if hasImage}
      <div class="relative aspect-[16/9] w-full overflow-hidden bg-ripple-muted">
        <Image src={image} alt={title} fit="cover" rounded="none" class="h-full w-full" />
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        {#if badge}
          <div class="absolute left-4 top-4">
            <Badge text={badge} variant="secondary" />
          </div>
        {/if}
        <div class="absolute inset-x-0 bottom-0 p-5 text-white">
          <Heading text={title} level={2} class="text-white" />
          {#if subtitle}<p class="mt-1 text-sm text-white/80">{subtitle}</p>{/if}
        </div>
      </div>
    {:else}
      <div class="flex items-start justify-between gap-4 px-5 pt-5">
        <div class="min-w-0">
          <Heading text={title} level={2} />
          {#if subtitle}<p class="mt-1 text-sm text-muted-foreground">{subtitle}</p>{/if}
        </div>
        {#if badge}<Badge text={badge} variant="secondary" />{/if}
      </div>
    {/if}

    <div class="flex flex-col gap-5 p-5">
      {#if rating || location}
        <div class="flex flex-wrap items-center gap-4 text-sm">
          {#if rating}
            <span class="inline-flex items-center gap-1.5 font-medium">
              <Icon name="star" size={16} class="text-ripple-accent" />{rating}
            </span>
          {/if}
          {#if location}
            <span class="inline-flex items-center gap-1.5 text-muted-foreground">
              <Icon name="map-pin" size={15} />{location}
            </span>
          {/if}
        </div>
      {/if}

      {#if description}
        <Text text={description} size="sm" class="leading-relaxed whitespace-pre-line" />
      {/if}

      {#if price != null || onAction}
        <div class="flex items-center justify-between gap-4 border-t border-ripple-border/50 pt-5">
          {#if price != null}
            <PriceTag {price} {originalPrice} size="md" />
          {/if}
          {#if onAction}
            <div class={price != null ? '' : 'ml-auto'}>
              <Button label={label} variant="primary" size="lg" onclick={() => onAction?.(item)} />
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
