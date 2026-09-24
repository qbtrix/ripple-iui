<!-- src/lib/widgets/input/FilterBar.svelte -->
<script lang="ts">
  import { DropdownMenu as DM } from 'bits-ui';
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import XIcon from '@lucide/svelte/icons/x';
  import PlusIcon from '@lucide/svelte/icons/plus';

  type ActiveFilter = {
    key: string;
    /** Optional display label override. Defaults to the option's label. */
    label?: string;
    /** Filter value (string, number, boolean, or array). */
    value?: unknown;
  };

  type FilterOption = {
    key: string;
    label: string;
    /** When provided, future versions can render a value editor; v1 just adds the key. */
    type?: 'text' | 'number' | 'boolean' | 'select';
    /** Optional default value when this filter is added. */
    default?: unknown;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Available filter definitions. */
    options?: FilterOption[];
    /** Currently active filters. Bind via `bind: "<state-path>"`. */
    value?: ActiveFilter[];
    /** Trigger label for the "add filter" button. */
    addLabel?: string;
    /** Show a "Clear all" button when there are active filters. */
    showClearAll?: boolean;
    onchange?: (value: ActiveFilter[]) => void;
  }

  let {
    id,
    class: className,
    style,
    options: rawOptions = [],
    value = [],
    addLabel = 'Filter',
    showClearAll = true,
    onchange
  }: Props = $props();

  const options = $derived(safeArray<FilterOption>(rawOptions, { widget: 'filter-bar', key: 'options' }));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const active = $derived(Array.isArray(value) ? value : []);
  const activeKeys = $derived(new Set(active.map((f) => f.key)));
  const inactiveOptions = $derived(options.filter((o) => !activeKeys.has(o.key)));

  function emit(next: ActiveFilter[]) {
    onchange?.(next);
  }

  function addFilter(opt: FilterOption) {
    const next: ActiveFilter[] = [
      ...active,
      { key: opt.key, label: opt.label, value: opt.default }
    ];
    emit(next);
  }

  function removeFilter(key: string) {
    emit(active.filter((f) => f.key !== key));
  }

  function clearAll() {
    emit([]);
  }

  function getLabelFor(filter: ActiveFilter): string {
    if (filter.label) return filter.label;
    return options.find((o) => o.key === filter.key)?.label ?? filter.key;
  }

  function formatValue(v: unknown): string {
    if (v === null || v === undefined || v === '') return '';
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
  }
</script>

<div
  {id}
  class={cn('flex items-center gap-1.5 flex-wrap', className)}
  style={styleString}
  role="group"
  aria-label="Filters"
>
  {#each active as filter (filter.key)}
    {@const label = getLabelFor(filter)}
    {@const display = formatValue(filter.value)}
    <span
      class="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 pl-2.5 pr-1 py-0.5 text-xs"
    >
      <span class="font-medium text-foreground">{label}</span>
      {#if display}
        <span class="text-muted-foreground">·</span>
        <span class="text-muted-foreground truncate max-w-[10rem]">{display}</span>
      {/if}
      <button
        type="button"
        class="rounded-full p-0.5 hover:bg-muted transition-colors"
        aria-label={`Remove ${label}`}
        onclick={() => removeFilter(filter.key)}
      >
        <XIcon size={12} />
      </button>
    </span>
  {/each}

  {#if inactiveOptions.length > 0}
    <DM.Root>
      <DM.Trigger
        class="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
      >
        <PlusIcon size={12} />
        {addLabel}
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          sideOffset={4}
          class="z-50 min-w-[160px] rounded-md border border-border bg-popover text-popover-foreground p-1 shadow-md"
        >
          {#each inactiveOptions as opt (opt.key)}
            <DM.Item
              onSelect={() => addFilter(opt)}
              class="cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted"
            >
              {opt.label}
            </DM.Item>
          {/each}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  {/if}

  {#if showClearAll && active.length > 0}
    <button
      type="button"
      class="text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5"
      onclick={clearAll}
    >
      Clear all
    </button>
  {/if}
</div>
