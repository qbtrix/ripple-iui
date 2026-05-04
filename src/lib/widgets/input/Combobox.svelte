<!-- src/lib/widgets/input/Combobox.svelte -->
<script lang="ts">
  import { Popover as P } from 'bits-ui';
  import { cn } from '$lib/utils.js';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import CheckIcon from '@lucide/svelte/icons/check';
  import SearchIcon from '@lucide/svelte/icons/search';

  type Option = {
    value: string | number;
    label: string;
    description?: string;
    disabled?: boolean;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    options?: Option[];
    value?: string | number | null;
    disabled?: boolean;
    onchange?: (value?: unknown) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    emptyText = 'No results',
    options = [],
    value = null,
    disabled = false,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let open = $state(false);
  let query = $state('');
  let highlight = $state(0);

  const filtered = $derived(
    !query
      ? options
      : options.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.description?.toLowerCase().includes(query.toLowerCase()) ?? false)
        )
  );

  const selected = $derived(options.find((o) => o.value === value) ?? null);

  function pick(opt: Option) {
    if (opt.disabled) return;
    onchange?.(opt.value);
    open = false;
    query = '';
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlight = Math.min(highlight + 1, filtered.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlight = Math.max(highlight - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) pick(opt);
    } else if (e.key === 'Escape') {
      open = false;
    }
  }

  // Reset highlight when query changes
  $effect(() => {
    void query;
    highlight = 0;
  });
</script>

<div class={cn('flex flex-col gap-1.5', className)} style={styleString}>
  {#if label}
    <label for={id} class="text-sm font-medium">{label}</label>
  {/if}

  <P.Root bind:open>
    <P.Trigger
      {id}
      {disabled}
      class={cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs',
        'transition-[color,box-shadow] outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        !selected && 'text-muted-foreground'
      )}
    >
      <span class="truncate text-left">{selected ? selected.label : placeholder}</span>
      <ChevronDownIcon size={14} class="opacity-60 shrink-0" />
    </P.Trigger>

    <P.Portal>
      <P.Content
        sideOffset={4}
        class="z-50 w-[var(--bits-popover-anchor-width)] min-w-[200px] rounded-md border border-border bg-popover text-popover-foreground shadow-md"
      >
        <div class="flex items-center gap-2 border-b border-border px-3 py-2">
          <SearchIcon size={14} class="opacity-60 shrink-0" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            bind:value={query}
            onkeydown={onKeyDown}
            aria-label={searchPlaceholder}
          />
        </div>

        <ul class="max-h-[260px] overflow-y-auto p-1 m-0 list-none" role="listbox">
          {#if filtered.length === 0}
            <li class="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</li>
          {:else}
            {#each filtered as opt, i (opt.value)}
              {@const isSelected = opt.value === value}
              {@const isHighlighted = i === highlight}
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onmouseenter={() => (highlight = i)}
                  onclick={() => pick(opt)}
                  class={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left transition-colors',
                    isHighlighted && 'bg-muted',
                    isSelected && 'font-medium',
                    opt.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <CheckIcon size={14} class={cn('shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                  <span class="flex-1 min-w-0">
                    <span class="block truncate">{opt.label}</span>
                    {#if opt.description}
                      <span class="block truncate text-xs text-muted-foreground">{opt.description}</span>
                    {/if}
                  </span>
                </button>
              </li>
            {/each}
          {/if}
        </ul>
      </P.Content>
    </P.Portal>
  </P.Root>
</div>
