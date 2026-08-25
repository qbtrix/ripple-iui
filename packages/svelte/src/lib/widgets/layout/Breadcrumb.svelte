<!-- src/lib/widgets/layout/Breadcrumb.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import SlashIcon from '@lucide/svelte/icons/slash';
  import HomeIcon from '@lucide/svelte/icons/home';

  type Item = {
    label: string;
    href?: string;
    icon?: string;
  };

  type Separator = 'chevron' | 'slash' | string;

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    items: Item[];
    separator?: Separator;
    /** When provided, fires on click of any non-current item with `{ index, item }`. */
    onnavigate?: (detail: { index: number; item: Item }) => void;
  }

  let {
    id,
    class: className,
    style,
    items,
    separator = 'chevron',
    onnavigate
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const safeItems = $derived(Array.isArray(items) ? items : []);
</script>

<nav
  {id}
  aria-label="Breadcrumb"
  class={cn('flex items-center text-sm text-muted-foreground', className)}
  style={styleString}
>
  <ol class="flex items-center gap-1.5 flex-wrap">
    {#each safeItems as item, i (i)}
      {@const isLast = i === safeItems.length - 1}
      <li class="flex items-center gap-1.5">
        {#if isLast}
          <span class="inline-flex items-center gap-1 font-medium text-foreground" aria-current="page">
            {#if item.icon === 'home'}<HomeIcon size={14} />{/if}
            {item.label}
          </span>
        {:else if item.href}
          <a
            href={item.href}
            class="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            onclick={() => onnavigate?.({ index: i, item })}
          >
            {#if item.icon === 'home'}<HomeIcon size={14} />{/if}
            {item.label}
          </a>
        {:else}
          <button
            type="button"
            class="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            onclick={() => onnavigate?.({ index: i, item })}
          >
            {#if item.icon === 'home'}<HomeIcon size={14} />{/if}
            {item.label}
          </button>
        {/if}

        {#if !isLast}
          <span aria-hidden="true" class="text-muted-foreground/60 inline-flex items-center">
            {#if separator === 'chevron'}
              <ChevronRightIcon size={14} />
            {:else if separator === 'slash'}
              <SlashIcon size={12} />
            {:else}
              <span class="text-xs">{separator}</span>
            {/if}
          </span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
