<!-- src/lib/widgets/data/Calendar.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

  type Event = {
    id: string | number;
    title: string;
    /** YYYY-MM-DD or full ISO. */
    start: string;
    /** YYYY-MM-DD or full ISO. Defaults to start. */
    end?: string;
    color?: string;
  };

  type View = 'month' | 'week';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    events?: Event[];
    view?: View;
    /** ISO date for the focused day. Bind via `bind: "<state-path>"`. */
    value?: string | null;
    locale?: string;
    onchange?: (iso: string) => void;
    onselect?: (event: Event) => void;
  }

  let {
    id,
    class: className,
    style,
    events: rawEvents = [],
    view = 'month',
    value = null,
    locale = 'en-US',
    onchange,
    onselect
  }: Props = $props();

  const events = $derived(safeArray<Event>(rawEvents, { widget: 'calendar', key: 'events' }));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function parseISO(s: string | null | undefined): Date | null {
    if (!s) return null;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  function toISO(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }

  function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  let viewDate = $state<Date>(parseISO(value) ?? new Date());

  function shift(days: number) {
    const d = new Date(viewDate);
    if (view === 'month') d.setMonth(d.getMonth() + (days > 0 ? 1 : -1));
    else d.setDate(d.getDate() + days);
    viewDate = d;
  }

  function startOfWeek(d: Date): Date {
    const out = new Date(d);
    out.setDate(d.getDate() - d.getDay());
    return out;
  }

  function startOfMonthGrid(d: Date): Date {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    return startOfWeek(first);
  }

  const weekdayLabels = $derived.by(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return [0, 1, 2, 3, 4, 5, 6].map((i) => fmt.format(new Date(2026, 1, 1 + i)));
  });

  type Cell = { date: Date; isCurrentMonth: boolean; events: Event[] };

  function eventsOnDay(d: Date): Event[] {
    return events.filter((ev) => {
      const s = parseISO(ev.start);
      const e = parseISO(ev.end ?? ev.start);
      if (!s || !e) return false;
      return d >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) &&
             d <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
    });
  }

  const monthCells = $derived.by<Cell[]>(() => {
    if (view !== 'month') return [];
    const start = startOfMonthGrid(viewDate);
    const out: Cell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push({
        date: d,
        isCurrentMonth: d.getMonth() === viewDate.getMonth(),
        events: eventsOnDay(d)
      });
    }
    return out;
  });

  const weekCells = $derived.by<Cell[]>(() => {
    if (view !== 'week') return [];
    const start = startOfWeek(viewDate);
    const out: Cell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push({ date: d, isCurrentMonth: d.getMonth() === viewDate.getMonth(), events: eventsOnDay(d) });
    }
    return out;
  });

  const headerLabel = $derived(
    view === 'month'
      ? viewDate.toLocaleString(locale, { month: 'long', year: 'numeric' })
      : (() => {
          const start = startOfWeek(viewDate);
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          const sameMonth = start.getMonth() === end.getMonth();
          const fmtDay = (d: Date) => d.toLocaleString(locale, { month: 'short', day: 'numeric' });
          return sameMonth
            ? `${start.toLocaleString(locale, { month: 'long' })} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`
            : `${fmtDay(start)} – ${fmtDay(end)}, ${end.getFullYear()}`;
        })()
  );

  const today = new Date();

  function pickDay(d: Date) {
    onchange?.(toISO(d));
  }
</script>

<div
  {id}
  class={cn('rounded-md border border-border bg-card overflow-hidden', className)}
  style={styleString}
>
  <div class="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
    <button
      type="button"
      onclick={() => shift(-1)}
      class="rounded p-1 hover:bg-muted transition-colors"
      aria-label={view === 'month' ? 'Previous month' : 'Previous week'}
    >
      <ChevronLeftIcon size={14} />
    </button>
    <div class="text-sm font-semibold">{headerLabel}</div>
    <button
      type="button"
      onclick={() => shift(1)}
      class="rounded p-1 hover:bg-muted transition-colors"
      aria-label={view === 'month' ? 'Next month' : 'Next week'}
    >
      <ChevronRightIcon size={14} />
    </button>
  </div>

  <div class="grid grid-cols-7 border-b border-border bg-muted/20">
    {#each weekdayLabels as w (w)}
      <div class="px-2 py-1.5 text-[11px] font-medium text-muted-foreground text-center">{w}</div>
    {/each}
  </div>

  <div class={cn('grid grid-cols-7', view === 'month' ? 'grid-rows-6' : 'grid-rows-1')}>
    {#each (view === 'month' ? monthCells : weekCells) as cell, i (i)}
      {@const isToday = isSameDay(today, cell.date)}
      {@const isSelected = !!parseISO(value) && isSameDay(parseISO(value)!, cell.date)}
      <button
        type="button"
        onclick={() => pickDay(cell.date)}
        class={cn(
          'relative flex flex-col items-stretch text-left border-r border-b border-border min-h-[88px] p-1.5 hover:bg-muted/30 transition-colors',
          !cell.isCurrentMonth && view === 'month' && 'bg-muted/10 text-muted-foreground/60',
          isSelected && 'ring-2 ring-primary ring-inset'
        )}
      >
        <span
          class={cn(
            'text-xs tabular-nums self-end px-1 rounded',
            isToday && 'bg-primary text-primary-foreground font-semibold'
          )}
        >
          {cell.date.getDate()}
        </span>
        <div class="flex-1 mt-1 flex flex-col gap-0.5 overflow-hidden">
          {#each cell.events.slice(0, 3) as ev (ev.id)}
            <span
              class="truncate text-[10px] rounded px-1 py-0.5 cursor-pointer"
              style={`background:${ev.color ?? '#3b82f6'}20; color:${ev.color ?? '#3b82f6'};`}
              onclick={(e) => { e.stopPropagation(); onselect?.(ev); }}
            >
              {ev.title}
            </span>
          {/each}
          {#if cell.events.length > 3}
            <span class="text-[10px] text-muted-foreground">+{cell.events.length - 3} more</span>
          {/if}
        </div>
      </button>
    {/each}
  </div>
</div>
