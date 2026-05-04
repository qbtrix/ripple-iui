<!-- src/lib/widgets/input/DatePicker.svelte -->
<script lang="ts">
  import { Popover as P } from 'bits-ui';
  import { cn } from '$lib/utils.js';
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    placeholder?: string;
    /** ISO date string (YYYY-MM-DD). Bind via `bind: "<state-path>"`. */
    value?: string | null;
    disabled?: boolean;
    locale?: string;
    format?: 'short' | 'medium' | 'long' | 'iso';
    min?: string;
    max?: string;
    onchange?: (value: string | null) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    placeholder = 'Pick a date',
    value = null,
    disabled = false,
    locale = 'en-US',
    format = 'medium',
    min,
    max,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let open = $state(false);

  function parseISO(s: string | null | undefined): Date | null {
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  function toISO(d: Date): string {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  }

  const selectedDate = $derived(parseISO(value));
  const minDate = $derived(parseISO(min ?? null));
  const maxDate = $derived(parseISO(max ?? null));

  let viewYear = $state<number>(0);
  let viewMonth = $state<number>(0);

  $effect(() => {
    const init = selectedDate ?? new Date();
    if (viewYear === 0 && viewMonth === 0) {
      viewYear = init.getFullYear();
      viewMonth = init.getMonth();
    }
  });

  function prevMonth() {
    if (viewMonth === 0) {
      viewMonth = 11;
      viewYear -= 1;
    } else {
      viewMonth -= 1;
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      viewMonth = 0;
      viewYear += 1;
    } else {
      viewMonth += 1;
    }
  }

  type Cell = { date: Date; current: boolean; disabled: boolean };

  const cells = $derived.by<Cell[]>(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startOffset = first.getDay();
    const start = new Date(viewYear, viewMonth, 1 - startOffset);
    const result: Cell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const isCurrentMonth = d.getMonth() === viewMonth;
      const isBeforeMin = !!minDate && d < minDate;
      const isAfterMax = !!maxDate && d > maxDate;
      result.push({ date: d, current: isCurrentMonth, disabled: isBeforeMin || isAfterMax });
    }
    return result;
  });

  const monthLabel = $derived(
    new Date(viewYear, viewMonth, 1).toLocaleString(locale, { month: 'long', year: 'numeric' })
  );

  const weekdayLabels = $derived.by(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return [0, 1, 2, 3, 4, 5, 6].map((i) =>
      fmt.format(new Date(2026, 1, 1 + i))
    );
  });

  const displayValue = $derived.by(() => {
    if (!selectedDate) return '';
    if (format === 'iso') return toISO(selectedDate);
    if (format === 'short') return selectedDate.toLocaleDateString(locale, { dateStyle: 'short' });
    if (format === 'long') return selectedDate.toLocaleDateString(locale, { dateStyle: 'long' });
    return selectedDate.toLocaleDateString(locale, { dateStyle: 'medium' });
  });

  function pick(d: Date, isDisabled: boolean) {
    if (isDisabled) return;
    onchange?.(toISO(d));
    open = false;
  }

  function isSameDay(a: Date | null, b: Date) {
    if (!a) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  const today = new Date();
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
        'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs',
        'transition-[color,box-shadow] outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        !selectedDate && 'text-muted-foreground'
      )}
    >
      <CalendarIcon size={14} class="opacity-60 shrink-0" />
      <span class="truncate text-left flex-1">{selectedDate ? displayValue : placeholder}</span>
    </P.Trigger>

    <P.Portal>
      <P.Content
        sideOffset={4}
        class="z-50 rounded-md border border-border bg-popover text-popover-foreground p-3 shadow-md"
      >
        <div class="flex items-center justify-between mb-2">
          <button
            type="button"
            onclick={prevMonth}
            class="rounded p-1 hover:bg-muted transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeftIcon size={14} />
          </button>
          <div class="text-sm font-medium">{monthLabel}</div>
          <button
            type="button"
            onclick={nextMonth}
            class="rounded p-1 hover:bg-muted transition-colors"
            aria-label="Next month"
          >
            <ChevronRightIcon size={14} />
          </button>
        </div>

        <div class="grid grid-cols-7 gap-0.5 text-[11px] text-muted-foreground mb-1">
          {#each weekdayLabels as w (w)}
            <div class="h-7 grid place-items-center">{w}</div>
          {/each}
        </div>

        <div class="grid grid-cols-7 gap-0.5" role="grid">
          {#each cells as cell, i (i)}
            {@const isSelected = isSameDay(selectedDate, cell.date)}
            {@const isToday = isSameDay(today, cell.date)}
            <div role="gridcell" aria-selected={isSelected}>
              <button
                type="button"
                disabled={cell.disabled}
                onclick={() => pick(cell.date, cell.disabled)}
                aria-label={cell.date.toDateString()}
                aria-pressed={isSelected}
                class={cn(
                  'h-8 w-8 rounded text-sm tabular-nums transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1',
                  cell.current ? 'text-foreground' : 'text-muted-foreground/50',
                  !cell.disabled && !isSelected && 'hover:bg-muted',
                  isSelected && 'bg-primary text-primary-foreground font-semibold',
                  !isSelected && isToday && 'ring-1 ring-ring',
                  cell.disabled && 'opacity-30 cursor-not-allowed'
                )}
              >
                {cell.date.getDate()}
              </button>
            </div>
          {/each}
        </div>
      </P.Content>
    </P.Portal>
  </P.Root>
</div>
