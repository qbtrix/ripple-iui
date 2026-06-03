<!-- src/lib/widgets/vertical/PeoplePicker.svelte -->
<script lang="ts">
  import { Popover as P } from 'bits-ui';
  import { cn } from '$lib/utils.js';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import SearchIcon from '@lucide/svelte/icons/search';
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';

  type Person = {
    id: string | number;
    name: string;
    email?: string;
    avatar?: string;
    role?: string;
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
    people?: Person[];
    /** Selected ids — array if multiple, scalar otherwise. */
    value?: (string | number) | (string | number)[] | null;
    multiple?: boolean;
    disabled?: boolean;
    onchange?: (value: unknown) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    placeholder = 'Assign people...',
    searchPlaceholder = 'Search by name or email...',
    emptyText = 'No matches',
    people = [],
    value = null,
    multiple = false,
    disabled = false,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let open = $state(false);
  let query = $state('');

  const selected = $derived.by(() => {
    if (multiple) return Array.isArray(value) ? value : [];
    return value !== null && value !== undefined ? [value as string | number] : [];
  });
  const selectedSet = $derived(new Set(selected));

  const filtered = $derived(
    !query
      ? people
      : people.filter((p) => {
          const q = query.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            (p.email?.toLowerCase().includes(q) ?? false) ||
            (p.role?.toLowerCase().includes(q) ?? false)
          );
        })
  );

  function getPerson(idv: string | number): Person | undefined {
    return people.find((p) => p.id === idv);
  }

  function initials(name: string): string {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function emit(next: unknown) {
    onchange?.(next);
  }

  function toggle(p: Person) {
    if (p.disabled) return;
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      const next = arr.includes(p.id) ? arr.filter((x) => x !== p.id) : [...arr, p.id];
      emit(next);
    } else {
      emit(p.id);
      open = false;
    }
  }

  function remove(idv: string | number) {
    if (!multiple) {
      emit(null);
      return;
    }
    const arr = Array.isArray(value) ? value : [];
    emit(arr.filter((x) => x !== idv));
  }
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
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <div class="flex flex-wrap items-center gap-1 min-w-0 flex-1 text-left">
        {#if selected.length === 0}
          <span class="text-muted-foreground px-1">{placeholder}</span>
        {:else}
          {#each selected as idv (idv)}
            {@const p = getPerson(idv)}
            {#if p}
              <span class="inline-flex items-center gap-1.5 rounded-full bg-muted pl-0.5 pr-1.5 py-0.5 text-xs">
                {#if p.avatar}
                  <img src={p.avatar} alt="" class="h-5 w-5 rounded-full object-cover" />
                {:else}
                  <span class="h-5 w-5 rounded-full bg-primary/20 text-primary text-[9px] font-bold grid place-items-center">
                    {initials(p.name)}
                  </span>
                {/if}
                <span class="truncate max-w-[8rem]">{p.name}</span>
                <button
                  type="button"
                  class="rounded-full hover:bg-background/60 p-0.5"
                  aria-label={`Remove ${p.name}`}
                  onclick={(e) => { e.stopPropagation(); remove(idv); }}
                >
                  <XIcon size={10} />
                </button>
              </span>
            {/if}
          {/each}
        {/if}
      </div>
      <ChevronDownIcon size={14} class="opacity-60 shrink-0" />
    </P.Trigger>

    <P.Portal>
      <P.Content
        sideOffset={4}
        class="z-50 w-[var(--bits-popover-anchor-width)] min-w-[280px] rounded-md border border-border bg-popover text-popover-foreground shadow-md"
      >
        <div class="flex items-center gap-2 border-b border-border px-3 py-2">
          <SearchIcon size={14} class="opacity-60 shrink-0" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            bind:value={query}
            aria-label={searchPlaceholder}
          />
        </div>

        <ul class="max-h-[280px] overflow-y-auto p-1 m-0 list-none" role="listbox" aria-multiselectable={multiple}>
          {#if filtered.length === 0}
            <li class="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</li>
          {:else}
            {#each filtered as p (p.id)}
              {@const isSelected = selectedSet.has(p.id)}
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={p.disabled}
                  onclick={() => toggle(p)}
                  class={cn(
                    'flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm text-left transition-colors hover:bg-muted',
                    isSelected && 'bg-muted/60',
                    p.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {#if p.avatar}
                    <img src={p.avatar} alt="" class="h-7 w-7 rounded-full object-cover shrink-0" />
                  {:else}
                    <span class="h-7 w-7 rounded-full bg-primary/15 text-primary text-[10px] font-bold grid place-items-center shrink-0">
                      {initials(p.name)}
                    </span>
                  {/if}
                  <span class="flex-1 min-w-0">
                    <span class="block font-medium truncate">{p.name}</span>
                    {#if p.email}
                      <span class="block text-xs text-muted-foreground truncate">{p.email}</span>
                    {/if}
                  </span>
                  {#if p.role}
                    <span class="text-[10px] uppercase tracking-wide rounded-full bg-muted/60 text-muted-foreground px-1.5 py-0.5">
                      {p.role}
                    </span>
                  {/if}
                  {#if isSelected}
                    <CheckIcon size={14} class="text-primary shrink-0" />
                  {/if}
                </button>
              </li>
            {/each}
          {/if}
        </ul>
      </P.Content>
    </P.Portal>
  </P.Root>
</div>
