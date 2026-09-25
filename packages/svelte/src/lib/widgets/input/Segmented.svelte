<!-- src/lib/widgets/input/Segmented.svelte
     Updated 2026-09-25 (shell new-look slice 1): options take an optional
     `badge` (string or number), rendered as a small accent pill after the
     label, for per-tab unread counts. Additive; nothing else moved.

     origin: slev12397/beautiful-ui@ff0f74d components/atoms/SegmentedControl.tsx

     Updated 2026-09-14 (beautiful-ui re-skin, lane A): the bordered strip of
     buttons becomes the source's pill track with a sliding thumb. The track is
     an inline-grid of equal-width segments on a tinted ground; a single
     absolutely-positioned thumb carries the selection and translates between
     columns on var(--ripple-ease-out), instead of each button painting its own
     selected background. Type is the source's 13px/medium.

     The thumb is single-select only. In `multiple` mode there is no one
     position to slide to, so it is hidden and the selected segments paint
     their own surface — same colours, no animation. It is also hidden when the
     current value matches no option, which is what stops a stray thumb parking
     under the first segment.

     Per the translation doc: the source's shadow-hairline under the thumb
     becomes ring-1 ring-ripple-border (shadows are dropped this arc), and
     bg-line/60 becomes bg-ripple-border/60 — a background use of the line
     colour that the table has no row for.

     Props, options shape, value/multiple/size/disabled and onchange are
     unchanged; the roles stay radiogroup/radio and group/checkbox, and the
     thumb is aria-hidden so it never joins the option count.

     Updated 2026-07-08: typed getIcon's Lucide lookup as a Svelte Component
     (was unknown, narrowed to {} at the render slot, failing svelte-check). -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { canonicalOptions } from '$lib/utils/safe-props.js';
  import * as icons from '@lucide/svelte';

  type Option =
    | string
    | { value: string | number; label: string; icon?: string; disabled?: boolean; badge?: string | number };

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

  const normalized = $derived(canonicalOptions(options, { widget: 'segmented', key: 'options' }));

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
    return ((icons as unknown) as Record<string, import('svelte').Component<any, any, any>>)[camel] ?? null;
  }

  const sizeClass = $derived(size === 'sm' ? 'h-7 text-[12px]' : 'h-8 text-[13px]');
  const padClass = $derived(size === 'sm' ? 'px-2.5' : 'px-3');

  // repeat(0, …) is invalid CSS, so an empty options list still needs one track.
  const columns = $derived(Math.max(1, normalized.length));
  // Thumb position. -1 (no match) hides it rather than parking it on segment 0.
  const selectedIndex = $derived(
    multiple ? -1 : normalized.findIndex((o) => o.value === value)
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
      // w-fit is kept from the pre-skin version: the source renders standalone,
      // but here the track is a child of a column flex, which would stretch it.
      'relative inline-grid w-fit select-none rounded-full bg-ripple-border/60 p-0.5',
      sizeClass,
      disabled && 'opacity-50 cursor-not-allowed'
    )}
    style="grid-template-columns: repeat({columns}, 1fr);"
  >
    {#if selectedIndex >= 0}
      <span
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-full bg-ripple-surface ring-1 ring-ripple-border transition-transform duration-200 ease-ripple-out motion-reduce:transition-none"
        style="width: calc((100% - 4px) / {columns}); transform: translateX({selectedIndex * 100}%);"
      ></span>
    {/if}

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
          'relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors duration-150 ease-ripple-out',
          padClass,
          selected
            ? 'text-ripple-surface-foreground'
            : 'text-ripple-muted-foreground hover:text-ripple-surface-foreground',
          // No sliding thumb in multiple mode — the segment paints its own surface.
          multiple && selected && 'bg-ripple-surface ring-1 ring-ripple-border',
          (opt as any).disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {#if Icon}<Icon size={14} />{/if}
        {opt.label}
        {#if opt.badge != null && opt.badge !== ''}
          <span
            data-segmented-badge
            class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ripple-accent/15 px-1 text-[10.5px] font-medium leading-none tabular-nums text-ripple-accent"
            >{opt.badge}</span
          >
        {/if}
      </button>
    {/each}
  </div>
</div>
