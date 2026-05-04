<!-- src/lib/widgets/input/OtpInput.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    /** OTP value as a string. Bind via `bind: "<state-path>"`. */
    value?: string;
    /** Number of digits/cells. */
    length?: number;
    /** When true, accept any character; otherwise only digits. */
    alpha?: boolean;
    /** Mask the cells (e.g. for security codes). */
    mask?: boolean;
    disabled?: boolean;
    /** Fired when all cells are populated. */
    oncomplete?: (value: string) => void;
    onchange?: (value: string) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    value = '',
    length = 6,
    alpha = false,
    mask = false,
    disabled = false,
    oncomplete,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let inputs = $state<HTMLInputElement[]>([]);

  const cells = $derived(
    Array.from({ length }, (_, i) => (value && value[i]) || '')
  );

  function setCharAt(i: number, ch: string) {
    const arr = value.padEnd(length, ' ').slice(0, length).split('');
    arr[i] = ch;
    const next = arr.join('').replace(/\s+$/, '');
    onchange?.(next);
    if (next.length === length && !next.includes(' ')) oncomplete?.(next);
  }

  function clearCharAt(i: number) {
    if (i >= value.length) return;
    const next = value.slice(0, i) + value.slice(i + 1);
    onchange?.(next);
  }

  function focusAt(i: number) {
    inputs[i]?.focus();
    inputs[i]?.select();
  }

  function isAllowed(ch: string): boolean {
    if (alpha) return /^[A-Za-z0-9]$/.test(ch);
    return /^[0-9]$/.test(ch);
  }

  function onInput(i: number, e: Event) {
    const target = e.target as HTMLInputElement;
    const raw = target.value;
    if (!raw) {
      clearCharAt(i);
      return;
    }
    const ch = raw[raw.length - 1];
    if (!isAllowed(ch)) {
      target.value = cells[i];
      return;
    }
    setCharAt(i, ch);
    if (i + 1 < length) focusAt(i + 1);
  }

  function onKeyDown(i: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !cells[i] && i > 0) {
      e.preventDefault();
      focusAt(i - 1);
      clearCharAt(i - 1);
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focusAt(i - 1);
    } else if (e.key === 'ArrowRight' && i + 1 < length) {
      focusAt(i + 1);
    }
  }

  function onPaste(i: number, e: ClipboardEvent) {
    const pasted = e.clipboardData?.getData('text') ?? '';
    const cleaned = pasted
      .split('')
      .filter(isAllowed)
      .slice(0, length - i)
      .join('');
    if (!cleaned) return;
    e.preventDefault();
    const before = value.slice(0, i);
    const after = value.slice(i + cleaned.length);
    const next = (before + cleaned + after).slice(0, length);
    onchange?.(next);
    const focusIdx = Math.min(i + cleaned.length, length - 1);
    setTimeout(() => focusAt(focusIdx), 0);
    if (next.length === length) oncomplete?.(next);
  }
</script>

<div class={cn('flex flex-col gap-1.5', className)} style={styleString}>
  {#if label}
    <label class="text-sm font-medium" for={id}>{label}</label>
  {/if}
  <div class="inline-flex items-center gap-1.5" {id}>
    {#each cells as ch, i (i)}
      <input
        bind:this={inputs[i]}
        type={mask ? 'password' : 'text'}
        inputmode={alpha ? 'text' : 'numeric'}
        maxlength="1"
        autocomplete="one-time-code"
        {disabled}
        value={ch}
        aria-label={`Digit ${i + 1} of ${length}`}
        oninput={(e) => onInput(i, e)}
        onkeydown={(e) => onKeyDown(i, e)}
        onpaste={(e) => onPaste(i, e)}
        onfocus={(e) => (e.target as HTMLInputElement).select()}
        class={cn(
          'h-11 w-9 rounded-md border border-input bg-ripple-input text-center text-lg font-semibold tabular-nums shadow-xs',
          'transition-[color,box-shadow] outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          ch && 'bg-muted/40',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />
    {/each}
  </div>
</div>
