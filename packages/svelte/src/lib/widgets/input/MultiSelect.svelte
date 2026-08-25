<!-- src/lib/widgets/input/MultiSelect.svelte -->
<script lang="ts">
  import { Popover as P } from 'bits-ui';
  import { cn } from '$lib/utils.js';
  import { canonicalOptions } from '$lib/utils/safe-props.js';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import CheckIcon from '@lucide/svelte/icons/check';
  import SearchIcon from '@lucide/svelte/icons/search';
  import XIcon from '@lucide/svelte/icons/x';

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
    /** Array of selected values. Bind via `bind: "<state-path>"`. */
    value?: (string | number)[];
    /** Allow creating arbitrary tags by pressing Enter when there's no exact match. */
    creatable?: boolean;
    /** Maximum chips shown inside the trigger before collapsing into "+N more". */
    maxChips?: number;
    disabled?: boolean;
    onchange?: (value: (string | number)[]) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    emptyText = 'No results',
    options: rawOptions = [],
    value = [],
    creatable = false,
    maxChips = 3,
    disabled = false,
    onchange
  }: Props = $props();

  const options = $derived(
    canonicalOptions(rawOptions, { widget: 'multiselect', key: 'options' }) as Option[]
  );

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let open = $state(false);
  let query = $state('');

  const selected = $derived(Array.isArray(value) ? value : []);
  const selectedSet = $derived(new Set(selected));

  const filtered = $derived(
    !query
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
  );

  const exactMatch = $derived(
    query.trim().length > 0 &&
      options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase())
  );

  function emit(next: (string | number)[]) {
    onchange?.(next);
  }

  function toggle(opt: Option) {
    if (opt.disabled) return;
    if (selectedSet.has(opt.value)) {
      emit(selected.filter((v) => v !== opt.value));
    } else {
      emit([...selected, opt.value]);
    }
  }

  function remove(v: string | number) {
    emit(selected.filter((x) => x !== v));
  }

  function createTag(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (selectedSet.has(v)) return;
    emit([...selected, v]);
    query = '';
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const opt = filtered[0];
      if (opt) {
        e.preventDefault();
        toggle(opt);
      } else if (creatable && query.trim() && !exactMatch) {
        e.preventDefault();
        createTag(query);
      }
    } else if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      remove(selected[selected.length - 1]);
    } else if (e.key === 'Escape') {
      open = false;
    }
  }

  function getOptionLabel(v: string | number): string {
    return options.find((o) => o.value === v)?.label ?? String(v);
  }

  const visibleChips = $derived(selected.slice(0, maxChips));
  const overflowCount = $derived(Math.max(0, selected.length - maxChips));
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
        'flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-xs',
        'transition-[color,box-shadow] outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-50'
      )}
    >
      <div class="flex flex-wrap items-center gap-1 min-w-0 flex-1 text-left">
        {#if selected.length === 0}
          <span class="text-muted-foreground px-1">{placeholder}</span>
        {:else}
          {#each visibleChips as v (v)}
            <span class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              <span class="truncate max-w-[8rem]">{getOptionLabel(v)}</span>
              <button
                type="button"
                aria-label={`Remove ${getOptionLabel(v)}`}
                class="rounded-full hover:bg-background/60 p-0.5"
                onclick={(e) => { e.stopPropagation(); remove(v); }}
              >
                <XIcon size={10} />
              </button>
            </span>
          {/each}
          {#if overflowCount > 0}
            <span class="text-xs text-muted-foreground">+{overflowCount} more</span>
          {/if}
        {/if}
      </div>
      <ChevronDownIcon size={14} class="opacity-60 shrink-0" />
    </P.Trigger>

    <P.Portal>
      <P.Content
        sideOffset={4}
        class="z-50 w-[var(--bits-popover-anchor-width)] min-w-[220px] rounded-md border border-border bg-popover text-popover-foreground shadow-md"
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

        <ul class="max-h-[260px] overflow-y-auto p-1 m-0 list-none" role="listbox" aria-multiselectable="true">
          {#if filtered.length === 0 && !creatable}
            <li class="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</li>
          {:else}
            {#each filtered as opt (opt.value)}
              {@const isSelected = selectedSet.has(opt.value)}
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onclick={() => toggle(opt)}
                  class={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left transition-colors hover:bg-muted',
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
            {#if creatable && query.trim() && !exactMatch}
              <li class="border-t border-border mt-1 pt-1">
                <button
                  type="button"
                  onclick={() => createTag(query)}
                  class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-muted"
                >
                  <span class="text-muted-foreground">Create</span>
                  <span class="font-medium">"{query}"</span>
                </button>
              </li>
            {/if}
          {/if}
        </ul>
      </P.Content>
    </P.Portal>
  </P.Root>
</div>
