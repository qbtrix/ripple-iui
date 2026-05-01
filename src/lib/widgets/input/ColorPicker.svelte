<!-- src/lib/widgets/input/ColorPicker.svelte -->
<script lang="ts">
  import { Popover as P } from 'bits-ui';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    /** Hex color string (e.g. "#ff0000"). Bind via `bind: "<state-path>"`. */
    value?: string;
    /** Optional preset palette shown in the popover. */
    presets?: string[];
    /** Show a text input alongside the swatch for free-form hex entry. */
    showInput?: boolean;
    disabled?: boolean;
    onchange?: (value: string) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    value = '#3b82f6',
    presets = [
      '#000000', '#ffffff', '#94a3b8', '#64748b',
      '#ef4444', '#f97316', '#f59e0b', '#eab308',
      '#84cc16', '#22c55e', '#10b981', '#14b8a6',
      '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
      '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
    ],
    showInput = true,
    disabled = false,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function emit(c: string) {
    onchange?.(c);
  }

  function isValidHex(s: string): boolean {
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);
  }
</script>

<div class={cn('flex flex-col gap-1.5', className)} style={styleString}>
  {#if label}
    <label class="text-sm font-medium" for={id}>{label}</label>
  {/if}

  <P.Root>
    <P.Trigger
      {id}
      {disabled}
      class={cn(
        'inline-flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1 h-9 text-sm shadow-xs',
        'transition-[color,box-shadow] outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        aria-hidden="true"
        class="h-5 w-5 rounded border border-border shrink-0"
        style={`background:${value}`}
      ></span>
      <span class="tabular-nums">{value}</span>
    </P.Trigger>

    <P.Portal>
      <P.Content
        sideOffset={4}
        class="z-50 rounded-md border border-border bg-popover text-popover-foreground p-3 shadow-md w-[228px]"
      >
        <div class="grid grid-cols-5 gap-1.5 mb-3">
          {#each presets as c (c)}
            <button
              type="button"
              aria-label={c}
              class={cn(
                'h-8 w-8 rounded border border-border transition-transform hover:scale-110',
                value.toLowerCase() === c.toLowerCase() && 'ring-2 ring-primary ring-offset-2 ring-offset-popover'
              )}
              style={`background:${c}`}
              onclick={() => emit(c)}
            ></button>
          {/each}
        </div>

        <div class="flex items-center gap-2">
          <input
            type="color"
            value={isValidHex(value) ? value : '#000000'}
            oninput={(e) => emit((e.target as HTMLInputElement).value)}
            class="h-9 w-9 rounded border border-input cursor-pointer bg-transparent"
            aria-label="Custom color"
          />
          {#if showInput}
            <input
              type="text"
              value={value}
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                if (isValidHex(v)) emit(v);
              }}
              class="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              aria-label="Hex color"
            />
          {/if}
        </div>
      </P.Content>
    </P.Portal>
  </P.Root>
</div>
