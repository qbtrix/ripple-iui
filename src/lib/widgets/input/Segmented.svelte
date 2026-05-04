<!-- src/lib/widgets/input/Segmented.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import * as icons from '@lucide/svelte';

  type Option =
    | string
    | { value: string | number; label: string; icon?: string; disabled?: boolean };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    options?: Option[];
    /** Selected value (single) or array of values (multiple). */
    value?: string | number | (string | number)[] | null;
    multiple?: boolean;
    size?: 'sm' | 'md';
    disabled?: boolean;
    onchange?: (value: unknown) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    options = [],
    value = null,
    multiple = false,
    size = 'md',
    disabled = false,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const normalized = $derived(
    options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  );

  function isSelected(v: string | number): boolean {
    if (multiple) return Array.isArray(value) && value.includes(v);
    return value === v;
  }

  function pick(v: string | number) {
    if (disabled) return;
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
      onchange?.(next);
    } else {
      onchange?.(v);
    }
  }

  function getIcon(name?: string) {
    if (!name) return null;
    const camel = name
      .split('-')
      .map((p) => (p[0]?.toUpperCase() ?? '') + p.slice(1))
      .join('');
    return ((icons as unknown) as Record<string, unknown>)[camel] ?? null;
  }

  const sizeClass = $derived(
    size === 'sm' ? 'text-xs h-7 px-2' : 'text-sm h-9 px-3'
  );
</script>

<div class={cn('flex flex-col gap-1.5', className)} style={styleString}>
  {#if label}
    <label class="text-sm font-medium" for={id}>{label}</label>
  {/if}

  <div
    {id}
    role={multiple ? 'group' : 'radiogroup'}
    class={cn(
      'inline-flex items-stretch rounded-md border border-input bg-background p-0.5 gap-0.5 w-fit',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
  >
    {#each normalized as opt (opt.value)}
      {@const selected = isSelected(opt.value)}
      {@const Icon = getIcon((opt as any).icon)}
      <button
        type="button"
        role={multiple ? 'checkbox' : 'radio'}
        aria-checked={selected}
        disabled={disabled || (opt as any).disabled}
        onclick={() => pick(opt.value)}
        class={cn(
          'inline-flex items-center justify-center gap-1.5 rounded transition-colors font-medium',
          sizeClass,
          selected
            ? 'bg-background shadow-sm ring-1 ring-border text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          (opt as any).disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {#if Icon}<Icon size={14} />{/if}
        {opt.label}
      </button>
    {/each}
  </div>
</div>
