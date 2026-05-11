<!-- src/lib/widgets/input/TimePicker.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import ClockIcon from '@lucide/svelte/icons/clock';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    /** "HH:MM" (24-hour) or "HH:MM:SS". Bind via `bind: "<state-path>"`. */
    value?: string | null;
    showSeconds?: boolean;
    /** 12-hour ampm display (output is still 24-hour ISO-like). */
    use12Hour?: boolean;
    disabled?: boolean;
    /** Minute step (e.g. 5 to snap to nearest 5 minutes). */
    step?: number;
    onchange?: (value: string) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    value = null,
    showSeconds = false,
    use12Hour = false,
    disabled = false,
    step = 1,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function parse(v: string | null | undefined): { h: number; m: number; s: number } {
    if (!v) return { h: 0, m: 0, s: 0 };
    const parts = v.split(':');
    return {
      h: clamp(parseInt(parts[0] ?? '0', 10) || 0, 0, 23),
      m: clamp(parseInt(parts[1] ?? '0', 10) || 0, 0, 59),
      s: clamp(parseInt(parts[2] ?? '0', 10) || 0, 0, 59)
    };
  }

  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  }

  function format(h: number, m: number, s: number) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    if (showSeconds) return `${hh}:${mm}:${String(s).padStart(2, '0')}`;
    return `${hh}:${mm}`;
  }

  const parsed = $derived(parse(value));

  function emit(h: number, m: number, s: number) {
    onchange?.(format(h, m, s));
  }

  function setHour(raw: string) {
    let h = parseInt(raw, 10);
    if (isNaN(h)) h = 0;
    if (use12Hour) {
      h = clamp(h, 1, 12);
      // Preserve current AM/PM by keeping the existing high-bit
      const isPM = parsed.h >= 12;
      const baseHour = h === 12 ? 0 : h;
      h = isPM ? baseHour + 12 : baseHour;
    }
    h = clamp(h, 0, 23);
    emit(h, parsed.m, parsed.s);
  }

  function setMinute(raw: string) {
    let m = parseInt(raw, 10);
    if (isNaN(m)) m = 0;
    m = clamp(m, 0, 59);
    if (step > 1) m = Math.round(m / step) * step;
    emit(parsed.h, m, parsed.s);
  }

  function setSecond(raw: string) {
    let s = parseInt(raw, 10);
    if (isNaN(s)) s = 0;
    s = clamp(s, 0, 59);
    emit(parsed.h, parsed.m, s);
  }

  function toggleAmPm() {
    if (parsed.h >= 12) {
      emit(parsed.h - 12, parsed.m, parsed.s);
    } else {
      emit(parsed.h + 12, parsed.m, parsed.s);
    }
  }

  const displayHour = $derived.by(() => {
    if (!use12Hour) return String(parsed.h).padStart(2, '0');
    const h12 = parsed.h % 12 === 0 ? 12 : parsed.h % 12;
    return String(h12).padStart(2, '0');
  });

  const ampm = $derived(parsed.h >= 12 ? 'PM' : 'AM');

  function bumpHour(delta: number) {
    const h = (parsed.h + delta + 24) % 24;
    emit(h, parsed.m, parsed.s);
  }
  function bumpMinute(delta: number) {
    const stepMin = step || 1;
    const m = (parsed.m + delta * stepMin + 60) % 60;
    emit(parsed.h, m, parsed.s);
  }
  function bumpSecond(delta: number) {
    const s = (parsed.s + delta + 60) % 60;
    emit(parsed.h, parsed.m, s);
  }

  function onSegmentKey(e: KeyboardEvent, kind: 'h' | 'm' | 's') {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      kind === 'h' ? bumpHour(1) : kind === 'm' ? bumpMinute(1) : bumpSecond(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      kind === 'h' ? bumpHour(-1) : kind === 'm' ? bumpMinute(-1) : bumpSecond(-1);
    }
  }
</script>

<div class={cn('flex flex-col gap-1.5', className)} style={styleString}>
  {#if label}
    <label for={id} class="text-sm font-medium">{label}</label>
  {/if}

  <div
    {id}
    class={cn(
      'inline-flex items-center gap-1 h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs',
      'transition-[color,box-shadow] outline-none',
      'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
      disabled && 'cursor-not-allowed opacity-50'
    )}
  >
    <ClockIcon size={14} class="opacity-60 shrink-0" />

    <input
      type="text"
      inputmode="numeric"
      maxlength="2"
      {disabled}
      role="spinbutton"
      aria-label="Hours"
      aria-valuenow={use12Hour ? Number(displayHour) : parsed.h}
      aria-valuemin={use12Hour ? 1 : 0}
      aria-valuemax={use12Hour ? 12 : 23}
      class="w-7 bg-transparent text-center tabular-nums outline-none"
      value={displayHour}
      oninput={(e) => setHour((e.target as HTMLInputElement).value)}
      onkeydown={(e) => onSegmentKey(e, 'h')}
    />
    <span class="text-muted-foreground">:</span>

    <input
      type="text"
      inputmode="numeric"
      maxlength="2"
      {disabled}
      role="spinbutton"
      aria-label="Minutes"
      aria-valuenow={parsed.m}
      aria-valuemin={0}
      aria-valuemax={59}
      class="w-7 bg-transparent text-center tabular-nums outline-none"
      value={String(parsed.m).padStart(2, '0')}
      oninput={(e) => setMinute((e.target as HTMLInputElement).value)}
      onkeydown={(e) => onSegmentKey(e, 'm')}
    />

    {#if showSeconds}
      <span class="text-muted-foreground">:</span>
      <input
        type="text"
        inputmode="numeric"
        maxlength="2"
        {disabled}
        role="spinbutton"
        aria-label="Seconds"
        aria-valuenow={parsed.s}
        aria-valuemin={0}
        aria-valuemax={59}
        class="w-7 bg-transparent text-center tabular-nums outline-none"
        value={String(parsed.s).padStart(2, '0')}
        oninput={(e) => setSecond((e.target as HTMLInputElement).value)}
        onkeydown={(e) => onSegmentKey(e, 's')}
      />
    {/if}

    {#if use12Hour}
      <button
        type="button"
        {disabled}
        class="ml-1 rounded px-1.5 py-0.5 text-xs font-medium hover:bg-muted transition-colors"
        onclick={toggleAmPm}
      >
        {ampm}
      </button>
    {/if}
  </div>
</div>
