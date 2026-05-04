<!-- src/lib/widgets/layout/MasterDetail.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';

  type Item = Record<string, unknown> & {
    id?: string | number;
    value?: string | number;
    label?: string;
    title?: string;
    name?: string;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    items: Item[];
    /** Currently selected value. Bind via `bind: "<state-path>"`. */
    value?: string | number | null;
    /** Item field used as the unique key. */
    valueKey?: string;
    /** Item field used as the displayed label. */
    labelKey?: string;
    /** Item field used as a secondary description (optional). */
    descriptionKey?: string;
    /** Item field used as a small badge label (optional). */
    badgeKey?: string;
    /** Width of the master pane. */
    width?: string;
    /** Empty-state copy for the detail pane when nothing is selected. */
    emptyText?: string;
    /** Optional spec rendered in the detail pane. Receives `item` in loop context. */
    detail?: any;
    onchange?: (value?: unknown) => void;
    children?: Snippet;
  }

  let {
    id,
    class: className,
    style,
    items = [],
    value = null,
    valueKey = 'id',
    labelKey = 'label',
    descriptionKey = 'description',
    badgeKey = 'badge',
    width = '240px',
    emptyText = 'Select an item to see details',
    detail,
    onchange,
    children
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const safeItems = $derived(Array.isArray(items) ? items : []);

  function getValue(item: Item): string | number | undefined {
    const v = item[valueKey];
    if (v === undefined && valueKey === 'id' && item.value !== undefined) return item.value as any;
    return v as any;
  }
  function getLabel(item: Item): string {
    return (item[labelKey] ?? item.title ?? item.name ?? item.label ?? '') as string;
  }

  const selectedItem = $derived(safeItems.find((it) => getValue(it) === value));

  function select(item: Item) {
    onchange?.(getValue(item));
  }
</script>

<div
  {id}
  class={cn(
    'grid w-full overflow-hidden rounded-lg border border-border',
    className
  )}
  style={`grid-template-columns: ${width} 1fr; min-height: 240px; ${styleString ?? ''}`}
>
  <ul
    class="border-r border-ripple-border overflow-auto p-1.5 m-0 list-none"
    role="listbox"
  >
    {#each safeItems as item, i (getValue(item) ?? i)}
      {@const v = getValue(item)}
      {@const isSelected = v === value}
      <li>
        <button
          type="button"
          role="option"
          aria-selected={isSelected}
          class={cn(
            'w-full text-left rounded-md px-3 py-2 text-sm transition-colors',
            'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring',
            isSelected && 'bg-primary/10 text-primary'
          )}
          onclick={() => select(item)}
        >
          <div class="flex items-center justify-between gap-2">
            <span class="truncate font-medium">{getLabel(item)}</span>
            {#if item[badgeKey]}
              <span class="shrink-0 text-[10px] uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-muted text-muted-foreground">
                {item[badgeKey]}
              </span>
            {/if}
          </div>
          {#if item[descriptionKey]}
            <div class="text-xs text-muted-foreground truncate mt-0.5">
              {item[descriptionKey]}
            </div>
          {/if}
        </button>
      </li>
    {/each}
  </ul>

  <div class="overflow-auto p-4 min-w-0">
    {#if selectedItem && detail}
      <NodeRenderer node={detail} loopContext={{ item: selectedItem }} />
    {:else if selectedItem && children}
      {@render children()}
    {:else}
      <div class="h-full flex items-center justify-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    {/if}
  </div>
</div>
