<!--
  @file widgets/data/DiffTable.svelte
  @description NEW (beautiful-ui re-skin arc, skin-diff lane, 2026-09-17). An
    AI-proposed edit to tabular data, shown as a diff the user can pick from:
    rows marked `removed` are tinted red and struck through, rows marked `added`
    are tinted green, and every changed row carries a checkbox that includes or
    excludes that one change. The footer counts what is still included and an
    Apply button reports the chosen keys through `onapply`.

    origin: slev12397/beautiful-ui@ff0f74d components/primitives/DiffTable.tsx

    NOT A NEW TABLE. data/Table.svelte was the first candidate and does not fit:
    it reads `ui-events`/`ui-state`/`ui-data` through unguarded context calls,
    which is why it is off `$lib/ui`, and it has no per-row class or trailing-cell
    hook, so tints and a toggle would each be a new Table prop and a manifest
    shape change. DataGrid renders cells through NodeRenderer. So this composes
    the shadcn table primitives both of them are built on (components/ui/table)
    and adds only the diff layer.

    NOT REGISTERED. No spec-registry entry and no manifest entry; the manifest
    still reports 189 widgets. It reaches callers through `$lib/ui` only.

    DROPPED FROM THE SOURCE: the `useStage` timer, the hard-coded ice-cream rows
    and the `DOT` category colours. The timer was scripted demo state; its
    visible effect (removals tint at 180ms, additions open at 440ms, footer and
    checkboxes arrive with them) is CSS animation delay here, so every control
    works from the first frame. A caller wanting the source's category pill
    renders it through the `cell` snippet. `shadow-card` goes, per the glass rule.

    DEVIATIONS: the source makes the <tr> itself the control (tabindex +
    onClick) and uses a div with role="checkbox" for the added row. Here every
    changed row has a real checkbox in a trailing column, and each of the row's
    cells is a <label for> that checkbox, so clicking anywhere on the row still
    toggles it — natively, with no row click handler and nothing for a screen
    reader to guess at. The source strikes through one column; here every cell
    of an included removal is struck, so a removal never rests on red alone.
    Row text is the status colour mixed 50/50 with the foreground (the raw
    green token is 2.3:1 on white); figures are in the skin-diff status file.
  Modified: 2026-09-17 — an excluded change row no longer takes an accent
    hover wash; muted text on it measured 4.07:1 on ripple's light host.
  @a11y Checkbox names read "Include removing <first cell>" / "Include adding
    <first cell>". The applied confirmation sits in a polite live region that
    exists from mount, so it is announced.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Table from '$lib/components/ui/table/index.js';
  import Button from '$lib/widgets/input/Button.svelte';
  import CheckIcon from '@lucide/svelte/icons/check';

  interface DiffTableColumn {
    key: string;
    label: string;
  }

  interface DiffTableRow {
    key: string;
    /** Values by column key. */
    cells: Record<string, string | number>;
    /** Omit for an unchanged row. */
    change?: 'added' | 'removed';
    /** Seed whether this change starts included. Default true. The user's own toggle wins after that. */
    included?: boolean;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    columns?: DiffTableColumn[];
    rows?: DiffTableRow[];
    /** Custom cell content, e.g. a Badge. Row tint and strikethrough still apply around it. */
    cell?: Snippet<[{ row: DiffTableRow; column: DiffTableColumn; value: string | number | undefined }]>;
    /** Fires once, on Apply, with the keys of the changes still included. */
    onapply?: (keys: string[]) => void;
  }

  let {
    id,
    class: className,
    style,
    title,
    columns = [],
    rows = [],
    cell,
    onapply
  }: Props = $props();

  const uid = $props.id();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let toggled = $state<Record<string, boolean>>({});
  let applied = $state(false);

  const isIncluded = (row: DiffTableRow) => toggled[row.key] ?? row.included ?? true;
  const changes = $derived(rows.filter((r) => r.change));
  const chosen = $derived(changes.filter(isIncluded));
  const removals = $derived(chosen.filter((r) => r.change === 'removed').length);
  const additions = $derived(chosen.length - removals);

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  function apply() {
    applied = true;
    onapply?.(chosen.map((r) => r.key));
  }

  /** out: an included removal. in: an included addition. off: an excluded addition. */
  function tone(row: DiffTableRow): 'out' | 'in' | 'off' | null {
    if (!row.change) return null;
    if (!isIncluded(row)) return row.change === 'added' ? 'off' : null;
    return row.change === 'removed' ? 'out' : 'in';
  }

  // Written out in full: Tailwind reads this file as text.
  const ROW = {
    out: 'bg-ripple-error/10 hover:bg-ripple-error/10',
    in: 'bg-ripple-success/10 hover:bg-ripple-success/10',
    idle: 'hover:bg-transparent'
  };
  const ROW_LIVE = {
    out: 'bg-ripple-error/10 hover:bg-ripple-error/15',
    in: 'bg-ripple-success/10 hover:bg-ripple-success/15',
    // No hover wash on an untinted row: muted text on accent/10 measures 4.07:1
    // on ripple's own light host. The pointer cursor carries the affordance.
    idle: 'hover:bg-transparent'
  };

  function rowClass(row: DiffTableRow) {
    const t = tone(row);
    const set = row.change && !applied ? ROW_LIVE : ROW;
    return cn(
      'border-ripple-border',
      t === 'out' ? set.out : t === 'in' ? set.in : set.idle,
      row.change === 'removed' && 'ripple-difftable-mark'
    );
  }

  function cellClass(row: DiffTableRow, first: boolean) {
    const t = tone(row);
    return cn(
      'block truncate px-3 py-2.5 transition-[color,text-decoration-color] duration-200 ease-ripple-out motion-reduce:transition-none',
      first
        ? 'text-[13px] font-medium tabular-nums text-ripple-surface-foreground'
        : 'text-[12.5px] text-ripple-muted-foreground',
      t === 'off' && 'text-ripple-muted-foreground',
      t === 'out' ? 'line-through decoration-ripple-error/50' : 'decoration-transparent',
      t === 'out' && 'ripple-difftable-del-ink',
      t === 'in' && 'ripple-difftable-add-ink',
      row.change === 'removed' && 'ripple-difftable-mark',
      row.change && !applied && 'cursor-pointer'
    );
  }
</script>

{#snippet content(row: DiffTableRow, column: DiffTableColumn, first: boolean)}
  {@const value = row.cells[column.key]}
  {#if row.change}
    <label for="{uid}-{row.key}" class={cellClass(row, first)}>
      {#if cell}{@render cell({ row, column, value })}{:else}{value ?? ''}{/if}
    </label>
  {:else}
    <div class={cellClass(row, first)}>
      {#if cell}{@render cell({ row, column, value })}{:else}{value ?? ''}{/if}
    </div>
  {/if}
{/snippet}

<div
  {id}
  class={cn(
    'ripple-difftable overflow-hidden rounded-ripple bg-ripple-surface ring-1 ring-ripple-border',
    className
  )}
  style={styleString}
>
  {#if title || changes.length}
    <div class="flex items-center justify-between gap-3 border-b border-ripple-border px-3 py-2.5">
      <span class="truncate text-[12.5px] font-medium text-ripple-surface-foreground">{title ?? ''}</span>
      {#if changes.length && !applied}
        <span class="ripple-difftable-fade-in shrink-0 text-[11px] text-ripple-muted-foreground"
          >Click changed rows to toggle</span
        >
      {/if}
    </div>
  {/if}

  <Table.Root class="table-fixed border-collapse text-left">
    <Table.Header>
      <Table.Row class="border-ripple-border hover:bg-transparent">
        {#each columns as column (column.key)}
          <Table.Head class="h-auto px-3 py-2.5 text-[12px] font-medium text-ripple-muted-foreground">
            {column.label}
          </Table.Head>
        {/each}
        <Table.Head class="h-auto w-11 p-0"><span class="sr-only">Include</span></Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each rows as row (row.key)}
        {@const added = row.change === 'added'}
        <Table.Row class={rowClass(row)} data-change={row.change} data-included={row.change ? isIncluded(row) : undefined}>
          {#each columns as column, ci (column.key)}
            <Table.Cell class="p-0">
              {#if added}
                <!-- Additions open like the source's expanding row: 0fr → 1fr. -->
                <div class="ripple-difftable-reveal grid grid-rows-[1fr]">
                  <div class="min-h-0 overflow-hidden">{@render content(row, column, ci === 0)}</div>
                </div>
              {:else}
                {@render content(row, column, ci === 0)}
              {/if}
            </Table.Cell>
          {/each}
          <Table.Cell class="p-0">
            {#if row.change}
              {@const on = isIncluded(row)}
              <div class={cn('grid grid-rows-[1fr]', added ? 'ripple-difftable-reveal' : 'ripple-difftable-fade-in')}>
                <div class="min-h-0 overflow-hidden">
                  <span class="relative flex items-center justify-center py-2.5">
                    <input
                      id="{uid}-{row.key}"
                      type="checkbox"
                      checked={on}
                      disabled={applied}
                      onchange={(e) => (toggled[row.key] = e.currentTarget.checked)}
                      aria-label="Include {added ? 'adding' : 'removing'} {row.cells[columns[0]?.key] ?? row.key}"
                      class="ripple-difftable-box"
                      class:ripple-difftable-box-add={added}
                    />
                    {#if on}
                      <CheckIcon
                        size={11}
                        strokeWidth={3}
                        aria-hidden="true"
                        class={cn(
                          'pointer-events-none absolute',
                          added ? 'text-ripple-success-foreground' : 'text-ripple-error-foreground'
                        )}
                      />
                    {/if}
                  </span>
                </div>
              </div>
            {/if}
          </Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>

  {#if changes.length}
    <div
      class="ripple-difftable-fade-up flex min-h-11 items-center justify-between gap-2 border-t border-ripple-border p-2.5"
    >
      {#if !applied}
        <span class="pl-0.5 text-[11.5px] tabular-nums text-ripple-muted-foreground">
          {plural(removals, 'removal', 'removals')} · {plural(additions, 'addition', 'additions')}
        </span>
      {/if}
      <span aria-live="polite">
        {#if applied}
          <span
            class="ripple-difftable-pop-in ripple-difftable-add-ink inline-flex items-center gap-1.5 rounded-full bg-ripple-success/10 py-1 pr-2.5 pl-1 text-[12.5px] font-medium"
          >
            <span class="flex size-4.5 items-center justify-center rounded-full bg-ripple-success text-ripple-success-foreground">
              <CheckIcon size={11} strokeWidth={3} aria-hidden="true" />
            </span>
            {plural(chosen.length, 'edit', 'edits')} applied
          </span>
        {/if}
      </span>
      {#if !applied}
        <Button
          variant="primary"
          size="sm"
          disabled={chosen.length === 0}
          onclick={apply}
          label="Apply {plural(chosen.length, 'change', 'changes')}"
        />
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Row ink: the status colour pulled halfway to the foreground, so it darkens
     on light grounds and lightens on dark ones. The raw tokens fail 4.5:1 on
     white. Beats the cell's text-ripple-* utility because component CSS is
     unlayered and Tailwind's utilities sit in a layer. */
  .ripple-difftable-del-ink {
    color: color-mix(in oklab, var(--ripple-error) 50%, var(--ripple-surface-foreground));
  }
  .ripple-difftable-add-ink {
    color: color-mix(in oklab, var(--ripple-success) 50%, var(--ripple-surface-foreground));
  }

  .ripple-difftable-box {
    appearance: none;
    margin: 0;
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 1px solid var(--ripple-muted-foreground);
    background: var(--ripple-muted);
    cursor: pointer;
    transform: scale(0.92);
    transition:
      background-color 150ms var(--ripple-ease-out),
      border-color 150ms var(--ripple-ease-out),
      transform 150ms var(--ripple-ease-out);
  }
  /* The fill alone is under 3:1 on white for green, so the border carries the
     checked state at the ink colour. */
  .ripple-difftable-box:checked {
    transform: scale(1);
    background: var(--ripple-error);
    border-color: color-mix(in oklab, var(--ripple-error) 50%, var(--ripple-surface-foreground));
  }
  .ripple-difftable-box-add:checked {
    background: var(--ripple-success);
    border-color: color-mix(in oklab, var(--ripple-success) 50%, var(--ripple-surface-foreground));
  }
  .ripple-difftable-box:focus-visible {
    outline: 2px solid var(--ripple-ring);
    outline-offset: 2px;
  }
  .ripple-difftable-box:disabled {
    cursor: default;
  }

  /* The source's staging, as delays instead of a timer: removals mark at
     180ms, additions open at 440ms, and the controls arrive with them.
     `backwards` only — a forwards fill would pin the final frame and fight the
     tint when a row is toggled later. The <tr> belongs to Table.Row, so its
     class is reached through :global under this component's root. */
  .ripple-difftable :global(tr.ripple-difftable-mark),
  .ripple-difftable-mark {
    animation: ripple-difftable-mark 200ms var(--ripple-ease-out) 180ms backwards;
  }
  .ripple-difftable-reveal {
    animation: ripple-difftable-reveal 200ms var(--ripple-ease-out) 440ms backwards;
  }
  .ripple-difftable-fade-in {
    animation: ripple-difftable-fade-in 180ms var(--ripple-ease-out) 440ms backwards;
  }
  .ripple-difftable-fade-up {
    animation: ripple-difftable-fade-up 180ms var(--ripple-ease-out) 440ms backwards;
  }
  .ripple-difftable-pop-in {
    animation: ripple-difftable-pop-in 180ms var(--ripple-ease-out) both;
  }

  @keyframes ripple-difftable-mark {
    from {
      background-color: transparent;
      color: var(--ripple-surface-foreground);
      text-decoration-color: transparent;
    }
  }
  @keyframes ripple-difftable-reveal {
    from {
      grid-template-rows: 0fr;
      opacity: 0;
    }
  }
  @keyframes ripple-difftable-fade-in {
    from {
      opacity: 0;
    }
  }
  @keyframes ripple-difftable-fade-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  @keyframes ripple-difftable-pop-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ripple-difftable :global(tr.ripple-difftable-mark),
    .ripple-difftable-mark,
    .ripple-difftable-reveal,
    .ripple-difftable-fade-in,
    .ripple-difftable-fade-up,
    .ripple-difftable-pop-in {
      animation: none;
    }
    .ripple-difftable-box {
      transition: none;
    }
  }
</style>
