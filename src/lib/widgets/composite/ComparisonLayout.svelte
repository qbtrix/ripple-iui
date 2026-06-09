<!--
  @file ComparisonLayout.svelte
  @description Side-by-side product/option comparison with horizontal hero cards,
  section-tab feature grid, and Card/Table view toggle. Ported from OCEAN's
  ComparisonLayout and adapted to ripple conventions:
    - Standard {id, class, style} props
    - EventHandler-driven actions (primary + "Learn more") with onselect/onlearnmore fallbacks
    - Auto-feature inference when `features` is not supplied
    - Direct lucide icon imports for fixed glyphs; ripple's Icon for user-supplied icon names
  Modified: 2026-06-09 — state_referenced_locally: added svelte-ignore above
  `viewMode` $state — intentional uncontrolled default seed from `defaultView` prop. Recipe 7.
-->
<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';
  import StarIcon from '@lucide/svelte/icons/star';
  import PackageIcon from '@lucide/svelte/icons/package';
  import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
  import TableIcon from '@lucide/svelte/icons/table';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import type { EventHandler, EventHandlerOrArray } from '$lib/schema/event-handler.js';
  import type { EventDispatcher } from '$lib/core/event-dispatcher.js';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';

  type FeatureType = 'text' | 'boolean' | 'rating' | 'image' | 'color' | 'icon';

  interface CompareFeature {
    key: string;
    label: string;
    section?: string;
    type?: FeatureType;
    icon?: string;
    highlight?: boolean;
  }

  interface CompareItem {
    id: string;
    title?: string;
    name?: string;
    subtitle?: string;
    chip?: string;
    image?: string;
    price?: string | number;
    actions?: EventHandlerOrArray;
    learn_more?: EventHandlerOrArray;
    [key: string]: unknown;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    description?: string;
    items?: CompareItem[];
    features?: CompareFeature[];
    primaryLabel?: string;
    secondaryLabel?: string;
    showPrimary?: boolean;
    showSecondary?: boolean;
    /** Initial view mode for the detailed feature grid. */
    defaultView?: 'card' | 'table';
    /** Show the "differences only" toggle. */
    showDiffToggle?: boolean;
    onselect?: (id: string) => void;
    onlearnmore?: (id: string) => void;
  }

  let {
    id,
    class: className,
    style,
    title,
    description,
    items = [],
    features,
    primaryLabel = 'Select',
    secondaryLabel = 'Learn more',
    showPrimary = true,
    showSecondary = true,
    defaultView = 'card',
    showDiffToggle = true,
    onselect,
    onlearnmore
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // svelte-ignore state_referenced_locally
  let viewMode = $state<'card' | 'table'>(defaultView);
  let showDiffOnly = $state(false);
  let activeSection = $state<string | null>(null);

  const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
  const stateManager = getContext<StateManager | undefined>('ui-state');

  const safeItems = $derived(Array.isArray(items) ? items : []);

  /** Effective feature list — explicit `features` if provided, else inferred from item keys. */
  const allFeatures = $derived.by<CompareFeature[]>(() => {
    if (features && features.length > 0) return features;
    if (safeItems.length === 0) return [];

    const excluded = new Set([
      'id', 'title', 'name', 'subtitle', 'chip', 'image', 'description',
      'price', 'actions', 'learn_more', 'url', 'href', 'icon'
    ]);
    const keys = new Set<string>();
    for (const item of safeItems) {
      for (const k of Object.keys(item)) if (!excluded.has(k)) keys.add(k);
    }
    return Array.from(keys).map((key) => {
      const firstVal = safeItems.find((i) => i[key] !== null && i[key] !== undefined)?.[key];
      const type: FeatureType = typeof firstVal === 'boolean' ? 'boolean' : 'text';
      return {
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        section: 'Features',
        type
      };
    });
  });

  const sectionNames = $derived.by(() => {
    const names = new Set<string>();
    for (const f of allFeatures) names.add(f.section || 'Features');
    return Array.from(names);
  });

  $effect(() => {
    if (sectionNames.length > 0 && (activeSection === null || !sectionNames.includes(activeSection))) {
      activeSection = sectionNames[0];
    }
  });

  const activeSectionFeatures = $derived.by(() => {
    if (!activeSection) return allFeatures.slice(0, 6);
    return allFeatures.filter((f) => (f.section || 'Features') === activeSection);
  });

  const highlightFeatures = $derived.by(() => {
    const marked = allFeatures.filter((f) => f.highlight);
    return marked.length > 0 ? marked.slice(0, 5) : allFeatures.slice(0, 5);
  });

  function isDifferent(feature: CompareFeature): boolean {
    if (safeItems.length < 2) return true;
    const first = JSON.stringify(safeItems[0][feature.key]);
    return safeItems.some((item) => JSON.stringify(item[feature.key]) !== first);
  }

  function dispatchOrFallback(
    handler: EventHandlerOrArray | undefined,
    fallback: ((id: string) => void) | undefined,
    item: CompareItem
  ) {
    if (handler && eventDispatcher) {
      const handlers = Array.isArray(handler) ? handler : [handler];
      const ctx = { state: stateManager?.state ?? {}, item };
      void eventDispatcher.dispatch(handlers as EventHandler[], ctx, item);
      return;
    }
    fallback?.(item.id);
  }

  function handlePrimary(item: CompareItem) {
    dispatchOrFallback(item.actions, onselect, item);
  }

  function handleSecondary(item: CompareItem) {
    dispatchOrFallback(item.learn_more, onlearnmore, item);
  }

  function hasPrimary(item: CompareItem): boolean {
    return showPrimary && (item.actions !== undefined || onselect !== undefined);
  }

  function hasSecondary(item: CompareItem): boolean {
    return showSecondary && (item.learn_more !== undefined || onlearnmore !== undefined);
  }
</script>

<div {id} class={cn('w-full', className)} style={styleString}>
  {#if title || description}
    <div class="mb-5 sm:mb-7">
      {#if title}
        <h2 class="text-balance text-lg font-semibold tracking-tight sm:text-xl md:text-2xl">
          {title}
        </h2>
      {/if}
      {#if description}
        <p class="mt-1 text-pretty text-sm text-muted-foreground sm:mt-1.5 sm:text-[15px]">
          {description}
        </p>
      {/if}
    </div>
  {/if}

  <!-- Horizontal product cards -->
  <div class="space-y-2.5 sm:space-y-3">
    {#each safeItems as item (item.id)}
      <div class="group relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-transparent transition-all duration-300 hover:border-border hover:shadow-md hover:ring-primary/10">
        <div class="flex flex-row items-stretch">
          <!-- Image -->
          <div class="relative flex w-20 shrink-0 items-center justify-center bg-gradient-to-br from-muted/40 via-muted/20 to-transparent p-2.5 xs:w-24 xs:p-3 sm:w-36 sm:p-5 md:w-44 lg:w-52">
            {#if item.image}
              <img
                src={item.image}
                alt={item.title ?? item.name ?? ''}
                class="h-16 w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.04] xs:h-20 sm:h-24 md:h-28"
              />
            {:else}
              <div class="flex aspect-square h-16 items-center justify-center rounded-lg bg-muted/30 xs:h-20 sm:h-24 md:h-28">
                <PackageIcon size={28} class="text-muted-foreground/30" />
              </div>
            {/if}
          </div>

          <!-- Content -->
          <div class="flex min-w-0 flex-1 flex-col p-3 sm:p-5">
            <div class="mb-2 flex flex-col gap-1 sm:mb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-sm leading-snug font-semibold tracking-tight sm:text-base md:text-lg">
                  {item.title ?? item.name ?? ''}
                </h3>
                {#if item.subtitle || item.chip}
                  <p class="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
                    {item.subtitle ?? item.chip}
                  </p>
                {/if}
              </div>
              {#if item.price !== undefined && item.price !== null && item.price !== ''}
                <div class="shrink-0 text-sm font-semibold tabular-nums text-foreground sm:text-base md:text-lg">
                  {item.price}
                </div>
              {/if}
            </div>

            <!-- Spec pills -->
            {#if highlightFeatures.length > 0}
              <div class="mb-2.5 flex flex-wrap gap-1.5 sm:mb-3.5 sm:gap-2">
                {#each highlightFeatures.slice(0, 3) as feature}
                  {@const val = item[feature.key]}
                  {#if val !== null && val !== undefined && val !== ''}
                    <div class="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] leading-none sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs">
                      {#if feature.icon}
                        <Icon name={feature.icon} size={12} class="text-muted-foreground" />
                      {:else if feature.type === 'boolean'}
                        {#if val}
                          <CheckIcon size={12} class="text-emerald-500" />
                        {:else}
                          <XIcon size={12} class="text-muted-foreground/40" />
                        {/if}
                      {/if}
                      <span class="text-muted-foreground">{feature.label}:</span>
                      <span class="font-medium text-foreground/90">
                        {#if feature.type === 'boolean'}
                          {val ? 'Yes' : 'No'}
                        {:else}
                          {val}
                        {/if}
                      </span>
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}

            <!-- Actions -->
            {#if hasPrimary(item) || hasSecondary(item)}
              <div class="mt-auto flex flex-wrap items-center gap-1.5 pt-1 sm:gap-2">
                {#if hasPrimary(item)}
                  <button
                    type="button"
                    class="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-9 sm:px-4 sm:text-sm"
                    onclick={() => handlePrimary(item)}
                  >
                    {primaryLabel}
                  </button>
                {/if}
                {#if hasSecondary(item)}
                  <button
                    type="button"
                    class="inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5 hover:underline sm:h-9 sm:px-3 sm:text-sm"
                    onclick={() => handleSecondary(item)}
                  >
                    {secondaryLabel}
                  </button>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Detailed comparison -->
  {#if sectionNames.length > 0 && safeItems.length > 0}
    <div class="mt-7 border-t border-border/70 pt-5 sm:mt-9 sm:pt-7">
      <!-- Toolbar -->
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5 sm:gap-3">
        <div class="inline-flex rounded-lg border border-border/70 bg-muted/30 p-0.5 lg:hidden">
          <button
            type="button"
            aria-pressed={viewMode === 'card'}
            class={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
              viewMode === 'card'
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onclick={() => (viewMode = 'card')}
          >
            <LayoutGridIcon size={14} />
            <span class="hidden xs:inline">Cards</span>
          </button>
          <button
            type="button"
            aria-pressed={viewMode === 'table'}
            class={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
              viewMode === 'table'
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onclick={() => (viewMode = 'table')}
          >
            <TableIcon size={14} />
            <span class="hidden xs:inline">Table</span>
          </button>
        </div>

        {#if showDiffToggle && safeItems.length > 1}
          <label class="ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground select-none transition-colors hover:text-foreground sm:gap-2 sm:text-sm">
            <input
              type="checkbox"
              bind:checked={showDiffOnly}
              class="h-3.5 w-3.5 rounded border-muted-foreground/30 text-primary focus:ring-primary/30 sm:h-4 sm:w-4"
            />
            <span class="hidden xs:inline">Show differences only</span>
            <span class="xs:hidden">Diff only</span>
          </label>
        {/if}
      </div>

      <!-- Section tabs -->
      {#if sectionNames.length > 1}
        <div class="cmp-tabs-scroll -mx-3 mb-4 flex overflow-x-auto px-3 sm:mx-0 sm:mb-6 sm:justify-center sm:px-0">
          <div class="inline-flex gap-0.5 rounded-full border border-border/60 bg-muted/40 p-1 sm:gap-1">
            {#each sectionNames as section}
              <button
                type="button"
                aria-pressed={activeSection === section}
                class={cn(
                  'rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-all duration-200 sm:px-4 sm:py-1.5 sm:text-sm',
                  activeSection === section
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onclick={() => (activeSection = section)}
              >
                {section}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Card view (mobile) -->
      <div class={cn(viewMode === 'table' ? 'hidden' : 'lg:hidden')}>
        <div class="space-y-2.5 sm:space-y-3">
          {#each safeItems as item (item.id)}
            <div class="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
              <div class="flex items-center gap-2.5 border-b border-border/70 bg-muted/30 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
                {#if item.image}
                  <img
                    src={item.image}
                    alt={item.title ?? item.name ?? ''}
                    class="h-8 w-8 shrink-0 rounded-lg object-contain sm:h-10 sm:w-10"
                  />
                {:else}
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 sm:h-10 sm:w-10">
                    <PackageIcon size={16} class="text-muted-foreground/50" />
                  </div>
                {/if}
                <div class="min-w-0 flex-1">
                  <h4 class="truncate text-sm font-semibold tracking-tight sm:text-base">
                    {item.title ?? item.name ?? ''}
                  </h4>
                  {#if item.price !== undefined && item.price !== null && item.price !== ''}
                    <p class="truncate text-xs tabular-nums text-muted-foreground sm:text-sm">{item.price}</p>
                  {/if}
                </div>
              </div>
              <div class="divide-y divide-border/60">
                {#each activeSectionFeatures as feature}
                  {#if !showDiffOnly || isDifferent(feature)}
                    <div class="flex items-center justify-between gap-3 px-3 py-2 text-xs transition-colors hover:bg-muted/20 sm:px-4 sm:py-2.5 sm:text-sm">
                      <span class="min-w-0 flex-1 truncate text-muted-foreground">{feature.label}</span>
                      <span class="shrink-0 text-right font-medium">
                        {#if feature.type === 'boolean'}
                          {#if item[feature.key]}
                            <span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckIcon size={14} />
                              Yes
                            </span>
                          {:else}
                            <span class="text-muted-foreground/50">No</span>
                          {/if}
                        {:else if feature.type === 'rating'}
                          <span class="inline-flex gap-0.5">
                            {#each Array(5) as _, i}
                              <StarIcon
                                size={12}
                                class={i < Number(item[feature.key])
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground/20'}
                              />
                            {/each}
                          </span>
                        {:else if feature.type === 'color'}
                          <span
                            class="inline-block h-5 w-5 rounded-full border border-border shadow-sm align-middle"
                            style="background-color: {item[feature.key]}"
                          ></span>
                        {:else if feature.type === 'image' && item[feature.key]}
                          <img src={item[feature.key] as string} alt={feature.label} class="inline-block h-6 w-auto object-contain" />
                        {:else}
                          {item[feature.key] ?? '—'}
                        {/if}
                      </span>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Table view (desktop default; opt-in on mobile) -->
      <div class={cn(viewMode === 'card' ? 'hidden lg:block' : 'block')}>
        <div class="cmp-scroll">
          <div class="cmp-inner overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            <!-- Header -->
            <div
              class="cmp-grid sticky top-0 z-10 border-b border-border/70 bg-muted/40 backdrop-blur-md supports-[backdrop-filter]:bg-muted/30"
              style="--cmp-cols: {safeItems.length};"
            >
              <div class="p-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:p-3 sm:text-xs">
                {activeSection ?? ''}
              </div>
              {#each safeItems as item (item.id)}
                <div class="flex flex-col items-center justify-center gap-1 border-l border-border/70 p-2 text-center sm:p-3">
                  {#if item.image}
                    <img
                      src={item.image}
                      alt={item.title ?? item.name ?? ''}
                      class="hidden h-6 w-6 rounded object-contain sm:block sm:h-8 sm:w-8"
                    />
                  {/if}
                  <span class="truncate text-xs font-semibold tracking-tight sm:text-sm">
                    {item.title ?? item.name ?? ''}
                  </span>
                </div>
              {/each}
            </div>

            <!-- Rows -->
            {#each activeSectionFeatures as feature, rowIdx}
              {#if !showDiffOnly || isDifferent(feature)}
                <div
                  class={cn(
                    'cmp-grid border-b border-border/60 transition-colors last:border-0 hover:bg-muted/20',
                    rowIdx % 2 === 1 && 'bg-muted/10'
                  )}
                  style="--cmp-cols: {safeItems.length};"
                >
                  <div class="flex items-center gap-1.5 p-2 text-xs text-muted-foreground sm:gap-2 sm:p-3 sm:text-sm">
                    {#if feature.icon}
                      <Icon name={feature.icon} size={12} class="hidden shrink-0 sm:block" />
                    {/if}
                    <span class="cmp-clamp-2">{feature.label}</span>
                  </div>
                  {#each safeItems as item (item.id)}
                    <div class="flex items-center justify-center border-l border-border/60 p-2 text-center sm:p-3">
                      {#if feature.type === 'boolean'}
                        {#if item[feature.key]}
                          <CheckIcon size={16} class="text-emerald-500" />
                        {:else}
                          <span class="text-muted-foreground/30">—</span>
                        {/if}
                      {:else if feature.type === 'image' && item[feature.key]}
                        <img src={item[feature.key] as string} alt={feature.label} class="h-6 w-auto object-contain sm:h-8" />
                      {:else if feature.type === 'color'}
                        <div
                          class="h-4 w-4 rounded-full border border-border shadow-sm sm:h-5 sm:w-5"
                          style="background-color: {item[feature.key]}"
                        ></div>
                      {:else if feature.type === 'rating'}
                        <div class="flex gap-0.5">
                          {#each Array(5) as _, i}
                            <StarIcon
                              size={10}
                              class={i < Number(item[feature.key])
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/20'}
                            />
                          {/each}
                        </div>
                      {:else}
                        <span class="cmp-clamp-2 text-xs font-medium tabular-nums sm:text-sm">
                          {item[feature.key] ?? '—'}
                        </span>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .cmp-tabs-scroll {
    -ms-overflow-style: none;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .cmp-tabs-scroll::-webkit-scrollbar {
    display: none;
  }

  .cmp-scroll {
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x pan-y;
    margin-left: -0.75rem;
    margin-right: -0.75rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in oklab, var(--muted-foreground) 30%, transparent) transparent;
  }
  @media (min-width: 640px) {
    .cmp-scroll {
      margin-left: 0;
      margin-right: 0;
      padding-left: 0;
      padding-right: 0;
    }
  }
  .cmp-scroll::-webkit-scrollbar {
    height: 6px;
  }
  .cmp-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .cmp-scroll::-webkit-scrollbar-thumb {
    background-color: color-mix(in oklab, var(--muted-foreground) 30%, transparent);
    border-radius: 3px;
  }

  .cmp-inner {
    min-width: max(100%, 420px);
  }
  @media (min-width: 640px) {
    .cmp-inner {
      min-width: 100%;
    }
  }

  /* Comparison table grid — label column shrinks on phones, expands on larger screens */
  .cmp-grid {
    display: grid;
    grid-template-columns: minmax(88px, 120px) repeat(var(--cmp-cols, 1), minmax(88px, 1fr));
  }
  @media (min-width: 640px) {
    .cmp-grid {
      grid-template-columns: minmax(120px, 160px) repeat(var(--cmp-cols, 1), minmax(110px, 1fr));
    }
  }

  .cmp-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
