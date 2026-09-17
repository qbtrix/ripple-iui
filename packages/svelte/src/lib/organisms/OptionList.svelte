<!--
  OptionList.svelte — RIPPLE-NATIVE organism (Wave 2: organisms).
  Created 2026-06-07.
  Adapted from ocean-flow's organisms/OptionList.svelte, rewired off genesis
  widgets/shadcn onto ripple's molecules (SelectionIndicator) + display/Icon and
  ripple design tokens. Replaces the wizard's bare goal-pick buttons with real,
  polished option cards.

  A domain-agnostic selectable list/grid of options:
    - selection='single'   one choice at a time (radio semantics).
    - selection='multiple' many choices (checkbox semantics).
    - layout='list'|'grid' stacked rows or a responsive 2-up grid.
  Pure presentation — props in, UI out. The owning layout/flow owns selection
  state; we only reflect `selected` and emit onSelect(id). No data fetching.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import SelectionIndicator from '$lib/molecules/SelectionIndicator.svelte';

  interface Option {
    id: string;
    /** Primary label. `label` is accepted as an alias for `text`. */
    text?: string;
    label?: string;
    description?: string;
    /** Lucide icon slug (kebab-case), shown in a tinted leading tile. */
    icon?: string;
    disabled?: boolean;
  }

  interface Props {
    options: Option[];
    selection?: 'single' | 'multiple';
    layout?: 'list' | 'grid';
    /** A string id (single) or array of ids (multiple). */
    selected?: string | string[];
    onSelect?: (id: string) => void;
    class?: string;
  }

  let {
    options,
    selection = 'single',
    layout = 'list',
    selected = selection === 'multiple' ? [] : '',
    onSelect,
    class: className,
  }: Props = $props();

  function isSelected(id: string): boolean {
    if (selection === 'multiple') {
      return Array.isArray(selected) && selected.includes(id);
    }
    return selected === id;
  }

  function labelOf(option: Option): string {
    return option.text ?? option.label ?? option.id;
  }

  function handleSelect(option: Option) {
    if (option.disabled) return;
    onSelect?.(option.id);
  }

  const containerClass = $derived(
    layout === 'grid'
      ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
      : 'flex flex-col gap-3',
  );
</script>

<div
  class={cn(containerClass, className)}
  role={selection === 'single' ? 'radiogroup' : 'group'}
>
  {#each options as option (option.id)}
    {@const active = isSelected(option.id)}
    <button
      type="button"
      role={selection === 'single' ? 'radio' : 'checkbox'}
      aria-checked={active}
      disabled={option.disabled}
      onclick={() => handleSelect(option)}
      class={cn(
        'group/option flex w-full items-center gap-3 rounded-ripple border p-4 text-left transition-all duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        option.disabled && 'cursor-not-allowed opacity-50',
        active
          ? 'border-ripple-accent bg-ripple-accent/10 ring-1 ring-inset ring-ripple-accent/30'
          : 'border-ripple-border/70 bg-ripple-surface hover:-translate-y-0.5 hover:border-ripple-accent/50 hover:shadow-md',
      )}
    >
      {#if option.icon}
        <div
          class={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
            active
              ? 'bg-ripple-accent/15 text-ripple-accent'
              : 'bg-ripple-muted text-muted-foreground group-hover/option:text-ripple-accent',
          )}
        >
          <Icon name={option.icon} size={20} />
        </div>
      {:else}
        <SelectionIndicator selected={active} mode={selection} />
      {/if}

      <div class="min-w-0 flex-1">
        <p
          class={cn(
            'truncate font-medium leading-tight',
            active ? 'text-ripple-accent' : 'text-ripple-surface-foreground',
          )}
        >
          {labelOf(option)}
        </p>
        {#if option.description}
          <p class="mt-0.5 truncate text-sm text-muted-foreground">
            {option.description}
          </p>
        {/if}
      </div>

      {#if option.icon}
        <SelectionIndicator selected={active} mode={selection} size="sm" />
      {/if}
    </button>
  {/each}
</div>
