<!--
  OptionList.svelte: a selectable set of options (single = radio, multiple =
  checkbox). Pure presentation: the owner holds selection and gets onSelect(id).
  Layouts:
    - 'list' (default) and 'grid': button rows with a SelectionIndicator, or a
      Lucide `icon` slug in a tinted tile. OrganismRenderer's option-list uses these.
    - 'cards': choice tiles for flow steps (SelectLayout). Each tile wraps a REAL
      sr-only <input type=radio|checkbox>, so Tab, Space and screen readers are
      native. `icon` here must be a CHOICE_ICONS key (data-kit/icons.ts); any
      other name is ignored and choiceIconKey guesses from the label, then the
      description; no match = no icon. Grid is container-query driven: 1 column,
      2 from 480px, 3 when there are 3 or 6 short options.
  Invariant (cards, single): onSelect is a COMMIT, and in a flow a commit
  advances the step. Arrow keys move the native radio selection without
  committing; click, Enter, or Space commit exactly once.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import SelectionIndicator from '$lib/molecules/SelectionIndicator.svelte';
  import Check from '@lucide/svelte/icons/check';
  import { CHOICE_ICONS, ICON, choiceIconKey } from '$lib/widgets/data-kit/icons.js';

  interface Option {
    id: string;
    /** Primary label. `label` is accepted as an alias for `text`. */
    text?: string;
    label?: string;
    description?: string;
    /** list/grid: a Lucide slug. cards: a CHOICE_ICONS key (anything else is ignored). */
    icon?: string;
    disabled?: boolean;
  }

  interface Props {
    options: Option[];
    selection?: 'single' | 'multiple';
    layout?: 'list' | 'grid' | 'cards';
    /** Accessible name of the group. */
    label?: string;
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
    label,
    class: className,
  }: Props = $props();

  const uid = $props.id();

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

  // ── cards ──────────────────────────────────────────────────────────────
  // Local mirror of `selected`: native arrow keys move the radio without a
  // commit, and the tile has to follow the input, not wait for the owner.
  let current = $derived<string | string[]>(selected);
  let arrowing = false;

  const isOn = (id: string) =>
    selection === 'multiple' ? Array.isArray(current) && current.includes(id) : current === id;

  // Three across only when they fit: 3 or 6 options, short labels and hints.
  const threeUp = $derived(
    (options.length === 3 || options.length === 6) &&
      options.every((o) => labelOf(o).length <= 18 && (o.description?.length ?? 0) <= 40),
  );

  function onCardChange(e: Event, option: Option) {
    const input = e.currentTarget as HTMLInputElement;
    if (selection === 'multiple') {
      const arr = Array.isArray(current) ? current : [];
      current = input.checked ? [...arr, option.id] : arr.filter((v) => v !== option.id);
    } else {
      current = option.id;
      if (arrowing) return; // arrow keys browse; they never commit
    }
    handleSelect(option);
  }

  function onCardKeydown(e: KeyboardEvent, option: Option) {
    const input = e.currentTarget as HTMLInputElement;
    if (e.key.startsWith('Arrow')) {
      if (selection === 'single') {
        arrowing = true; // the native radio moves; onkeyup clears the flag
        return;
      }
      // Checkboxes have no native arrow keys: move focus only.
      e.preventDefault();
      const boxes = [...(input.closest('[data-slot="option-cards"]')?.querySelectorAll<HTMLInputElement>('input:not(:disabled)') ?? [])];
      const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
      boxes[(boxes.indexOf(input) + d + boxes.length) % boxes.length]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selection === 'multiple') input.click();
      else {
        current = option.id;
        handleSelect(option);
      }
    } else if (e.key === ' ' && selection === 'single' && input.checked) {
      // Space on the already-checked radio fires no change event: commit here.
      e.preventDefault();
      handleSelect(option);
    }
  }

  const containerClass = $derived(
    layout === 'grid'
      ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
      : 'flex flex-col gap-3',
  );
</script>

{#if layout === 'cards'}
<div class="@container" data-slot="option-cards">
  <div
    role={selection === 'single' ? 'radiogroup' : 'group'}
    aria-label={label}
    class={cn('grid grid-cols-1 gap-2 @min-[480px]:grid-cols-2', threeUp && '@min-[480px]:grid-cols-3', className)}
  >
    {#each options as option, i (option.id)}
      {@const on = isOn(option.id)}
      {@const key = choiceIconKey(labelOf(option), option.icon, option.description)}
      {@const CardIcon = key ? CHOICE_ICONS[key] : undefined}
      <label
        data-option-card={option.id}
        data-selected={on || undefined}
        class={cn(
          'relative flex min-w-0 gap-3 rounded-ripple border p-3 pr-9 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out',
          threeUp ? 'items-start @min-[480px]:flex-col' : 'items-start',
          'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ripple-ring',
          option.disabled
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer',
          on
            ? 'border-ripple-accent bg-ripple-accent/10 ring-1 ring-inset ring-ripple-accent/30'
            : 'border-ripple-border/70 bg-ripple-surface',
          !on && !option.disabled && 'hover:-translate-y-0.5 hover:border-ripple-accent/50 hover:shadow-sm motion-reduce:hover:translate-y-0',
        )}
      >
        <input
          class="sr-only"
          type={selection === 'single' ? 'radio' : 'checkbox'}
          name={uid}
          value={option.id}
          checked={on}
          disabled={option.disabled}
          aria-labelledby="{uid}-{i}"
          aria-describedby={option.description ? `${uid}-${i}-d` : undefined}
          onchange={(e) => onCardChange(e, option)}
          onkeydown={(e) => onCardKeydown(e, option)}
          onkeyup={() => (arrowing = false)}
        />
        {#if CardIcon}
          <span
            data-choice-icon={key}
            aria-hidden="true"
            class={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
              on ? 'bg-ripple-accent/15 text-ripple-accent' : 'bg-ripple-muted text-muted-foreground',
            )}
          >
            <CardIcon {...ICON.tile} />
          </span>
        {/if}
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            id="{uid}-{i}"
            class={cn('font-medium leading-snug', on ? 'text-ripple-accent' : 'text-ripple-surface-foreground')}
          >{labelOf(option)}</span>
          {#if option.description}
            <span id="{uid}-{i}-d" class="text-sm leading-snug text-muted-foreground">{option.description}</span>
          {/if}
        </span>
        <span
          aria-hidden="true"
          class={cn(
            'absolute right-3 top-3 flex size-5 items-center justify-center border-2 transition-colors',
            selection === 'single' ? 'rounded-full' : 'rounded-md',
            on ? 'border-ripple-accent bg-ripple-accent text-ripple-accent-foreground' : 'border-muted-foreground/30',
          )}
        >
          {#if on}<Check size={12} strokeWidth={3} />{/if}
        </span>
      </label>
    {/each}
  </div>
</div>
{:else}
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
{/if}
