<!--
  @file widgets/ai/TaskRows.svelte
  @description NEW (beautiful-ui re-skin arc, lane C, 2026-09-14). A compact
    read-only list of agent tasks: one row per task with a status badge
    (pending ring / running ring / green check / red cross), the task label, a
    right-aligned meta string, a status pill, and an expand/collapse region
    holding the task's detail sub-lines. Rows stagger in on mount.

    origin: slev12397/beautiful-ui@ff0f74d components/primitives/TaskRows.tsx

    NOT A RE-SKIN. Lane F checked TodoList, ChecklistLayout, Steps and
    OrderStatus: the first two are bound MUTATING surfaces (`value` +
    `onchange`) whose bind contract a re-skin would have to delete, and Steps is
    a static ordinal list with no status and no expansion. So this is new — and
    it deliberately carries NO `value`/`onchange`. The moment it grows one it is
    a worse ChecklistLayout, which stays the answer for a bound, spec-driven,
    mutable checklist. `ontoggle` is a disclosure event, not a data edit.

    NOT REGISTERED. No entry in the spec registry (`widgets/index.ts`) and no
    manifest entry, so the manifest still reports 189 widgets. It reaches
    callers through `$lib/ui` only. Making it spec-drivable is a deliberate
    follow-up that bumps the count on purpose.

    DROPPED FROM THE SOURCE: the `TICKS` state machine. The source drives row 2
    through pending → failed → done on a timer, and a `"sequence"` status exists
    only to mark the row that timer owns. That is scripted demo state a real
    caller must own, so `status` takes `pending | running | done | failed`
    directly and there is no timer. The stagger, which is animation rather than
    state, is kept. (Same rule applied to PromptBar's autoplay — see its header.)
  @a11y Each row's header is a real <button> disclosure carrying aria-expanded
    and aria-controls for its panel. Status is conveyed by a text pill and an
    icon, never by colour alone; the badge SVGs are aria-hidden and the status
    is read out in the pill or, for running/pending, the step number.
  Modified: 2026-09-16 — dropped `ripple-task-spin`, which was a fifth copy of a
    rotate keyframe this repo already had four of. Both spinners now use
    Tailwind's animate-spin, per the translation table. The reason the copy was
    added — that a scoped reduced-motion rule cannot reach a Tailwind utility —
    does not hold: the utility is a single bare class, so any selector with two
    classes or a Svelte scope hash outranks it. ReasoningTrace had already proved
    this on an identical raw element. Both handles are kept for exactly that job
    and carry no animation of their own. Cost: 1.1s and 1.2s become animate-spin's
    1s, so the ring and the retry glyph now turn at the same speed.
  2026-09-17 (fix/port-gaps): status-coloured text moved onto the readable
  text tokens (text-ripple-{error,success,warning,info}-text; red text that
  read text-destructive now reads text-ripple-error-text, the same hue since
  --ripple-error aliases --destructive). The raw tones are fill colours and
  measured 1.7-3.3:1 as text in light mode. Fills and tints are unchanged.
  Same pass: the solid done/failed badges deepen their fill 20% toward black
  (scoped .ripple-task-badge-done/-failed), so the white icon clears 3:1.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';
  import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

  type TaskStatus = 'pending' | 'running' | 'done' | 'failed';

  interface TaskDetail {
    label: string;
    /** Right-aligned monospace value, e.g. "12/12". */
    meta?: string;
  }

  interface TaskRow {
    key: string;
    label: string;
    /** Right-aligned summary, e.g. "12 suppliers". */
    meta?: string;
    status?: TaskStatus;
    /** Number drawn inside the ring for pending / running rows. */
    step?: number;
    details?: TaskDetail[];
    /** Seed this row expanded. The user's own toggle wins after that. */
    open?: boolean;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    rows?: TaskRow[];
    /** `capsules` — separate rounded surfaces. `list` — one divided surface. */
    variant?: 'capsules' | 'list';
    /** Pill copy. Only `done` and `failed` render a pill. */
    labels?: { done?: string; failed?: string };
    /** Disclosure event. Not a data edit — this widget mutates nothing. */
    ontoggle?: (key: string, open: boolean) => void;
  }

  let {
    id,
    class: className,
    style,
    rows = [],
    variant = 'capsules',
    labels,
    ontoggle,
  }: Props = $props();

  const copy = $derived({ done: labels?.done ?? 'Completed', failed: labels?.failed ?? 'Failed' });
  const list = $derived(variant === 'list');

  /** Per-row disclosure state. Seeded lazily from each row's own `open`. */
  let toggled = $state<Record<string, boolean>>({});
  const isOpen = (row: TaskRow) => toggled[row.key] ?? !!row.open;

  function toggle(row: TaskRow) {
    const next = !isOpen(row);
    toggled = { ...toggled, [row.key]: next };
    ontoggle?.(row.key, next);
  }

  // $props.id() is per-instance: a literal fallback gave every TaskRows on a
  // page the same panel ids, so each row's aria-controls pointed at the first
  // instance's panel. Same defect ToolCall and ReasoningTrace carried.
  const uid = $props.id();
  const panelId = (key: string) => `${id ?? uid}-${key}-panel`;

  // Ring geometry, matched to the source: 24px box, 2px stroke, a 28% arc.
  const RING = 24;
  const STROKE = 2;
  const R = (RING - STROKE) / 2;
  const C = 2 * Math.PI * R;

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

{#snippet ring(step: number | undefined, active: boolean)}
  <span class="relative inline-flex size-6 shrink-0 items-center justify-center">
    <svg
      width={RING}
      height={RING}
      class={cn('absolute inset-0', active && 'ripple-task-ring animate-spin')}
      aria-hidden="true"
    >
      <circle
        cx={RING / 2}
        cy={RING / 2}
        r={R}
        fill="none"
        stroke-width={STROKE}
        class="stroke-ripple-border"
      />
      {#if active}
        <circle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          fill="none"
          stroke-width={STROKE}
          stroke-linecap="round"
          stroke-dasharray={`${C * 0.28} ${C * 0.72}`}
          class="stroke-ripple-muted-foreground"
        />
      {/if}
    </svg>
    <span class="relative text-[10.5px] font-semibold tabular-nums text-ripple-surface-foreground">
      {step ?? ''}
    </span>
  </span>
{/snippet}

<div
  {id}
  data-ripple-node={id}
  data-variant={variant}
  class={cn(
    'ripple-task-rows flex w-full flex-col',
    list ? 'overflow-hidden rounded-ripple ring-1 ring-ripple-border bg-ripple-surface' : 'gap-2',
    className
  )}
  style={styleString}
>
  {#each rows as row, i (row.key)}
    {@const open = isOpen(row)}
    {@const status = row.status ?? 'pending'}
    <div
      data-state={status}
      style={`--i:${i}`}
      class={cn(
        'ripple-task-row self-stretch overflow-hidden transition-[border-radius,background-color] duration-300 ease-ripple-out hover:bg-ripple-accent/10',
        list
          ? 'border-b border-ripple-border last:border-0'
          : cn('bg-ripple-surface ring-1 ring-ripple-border', open ? 'rounded-[14px]' : 'rounded-[22px]')
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId(row.key)}
        onclick={() => toggle(row)}
        class="flex h-11 w-full items-center gap-2.5 px-2.5 text-left"
      >
        <span class="flex size-6 shrink-0 items-center justify-center">
          {#if status === 'done'}
            <span
              class="ripple-task-badge flex size-5.5 shrink-0 items-center justify-center rounded-full bg-ripple-success text-ripple-success-foreground ripple-task-badge-done"
            >
              <CheckIcon size={13} strokeWidth={3.5} aria-hidden="true" />
            </span>
          {:else if status === 'failed'}
            <span
              class="ripple-task-badge flex size-5.5 shrink-0 items-center justify-center rounded-full bg-ripple-error text-ripple-error-foreground ripple-task-badge-failed"
            >
              <XIcon size={12} strokeWidth={3.5} aria-hidden="true" />
            </span>
          {:else}
            {@render ring(row.step, status === 'running')}
          {/if}
        </span>

        <span class="min-w-0 flex-1 truncate text-[13px] font-medium text-ripple-surface-foreground">
          {row.label}
        </span>

        {#if row.meta}
          <span class="shrink-0 text-[12.5px] tabular-nums text-ripple-muted-foreground">{row.meta}</span>
        {/if}

        {#if status === 'done'}
          <span
            class="ripple-task-pill inline-flex h-5.5 shrink-0 items-center rounded-full bg-ripple-success/10 px-2 text-[11.5px] font-medium text-ripple-success-text"
          >
            {copy.done}
          </span>
        {:else if status === 'failed'}
          <span
            class="ripple-task-pill inline-flex h-5.5 shrink-0 items-center gap-1.5 rounded-full bg-ripple-error/10 px-2 text-[11.5px] font-medium text-ripple-error-text"
          >
            {copy.failed}
            <RotateCwIcon
              size={12}
              strokeWidth={3}
              class="ripple-task-retry animate-spin"
              aria-hidden="true"
            />
          </span>
        {/if}

        <span
          aria-hidden="true"
          class={cn(
            '-ml-2 flex size-7 shrink-0 items-center justify-center rounded-full text-ripple-muted-foreground transition-transform duration-300 ease-ripple-out',
            open && 'rotate-180'
          )}
        >
          <ChevronDownIcon size={15} strokeWidth={2.2} />
        </span>
      </button>

      <!-- Detail panel. Height animates through grid-template-rows 0fr -> 1fr,
           the same expandable grammar the source uses for its chain of thought. -->
      <div
        id={panelId(row.key)}
        data-state={open ? 'open' : 'closed'}
        class="ripple-task-panel grid"
      >
        <div class="overflow-hidden">
          <div class="mb-2.5 grid grid-cols-[24px_1fr] gap-2.5 px-2.5">
            <span aria-hidden="true" class="mx-auto h-full w-px bg-ripple-border"></span>
            <div class="flex flex-col gap-1.5">
              {#each row.details ?? [] as detail, j (detail.label)}
                <div
                  style={`--j:${j}`}
                  class={cn(
                    'flex items-center justify-between',
                    open && 'ripple-task-detail'
                  )}
                >
                  <span class="text-[12px] text-ripple-muted-foreground">{detail.label}</span>
                  {#if detail.meta}
                    <span class="font-mono text-[11.5px] tabular-nums text-ripple-muted-foreground">
                      {detail.meta}
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/each}
</div>

<style>
  /* Rows enter staggered, 80ms apart — the source's signature on this list. */
  .ripple-task-row {
    animation: ripple-task-fade-up 450ms var(--ripple-ease-out) calc(var(--i) * 80ms) both;
  }

  .ripple-task-badge {
    animation: ripple-task-pop-in 300ms var(--ripple-ease-out) both;
  }

  .ripple-task-pill {
    animation: ripple-task-fade-in 200ms ease-out both;
  }

  .ripple-task-detail {
    animation: ripple-task-fade-up 300ms var(--ripple-ease-out) calc(120ms + var(--j) * 100ms) both;
  }

  .ripple-task-panel {
    grid-template-rows: 0fr;
    opacity: 0;
    transition: grid-template-rows 300ms var(--ripple-ease-out), opacity 300ms var(--ripple-ease-out);
  }
  .ripple-task-panel[data-state='open'] {
    grid-template-rows: 1fr;
    opacity: 1;
  }

  /* Solid badges: the tone deepened 20% toward black under the white icon.
     Raw, white on success measured 2.31:1 and white on the dark-mode
     --destructive 2.89:1, under the 3:1 a status graphic needs. At 80% they
     measure 4.09:1 and 4.96:1. The bg-ripple-* utility stays as the token the
     hue comes from; this unlayered rule wins over it. */
  .ripple-task-badge-done {
    background-color: color-mix(in oklab, var(--ripple-success) 80%, black);
  }
  .ripple-task-badge-failed {
    background-color: color-mix(in oklab, var(--ripple-error) 80%, black);
  }

  /* Both spinners ride Tailwind's animate-spin. The classes below survive only
     as guard handles: animate-spin ships no reduced-motion rule of its own, so
     each needs a selector this component can outrank it with from the @media
     block. .ripple-task-ring is scope-hashed and :global(.ripple-task-rows
     .ripple-task-retry) is two classes deep — both beat a bare .animate-spin. */

  @keyframes ripple-task-fade-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes ripple-task-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes ripple-task-pop-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  /* The panel's height change is a transition, not an animation, so the
     house `animation: none` block does not reach it — zero it explicitly. */
  @media (prefers-reduced-motion: reduce) {
    .ripple-task-row,
    .ripple-task-badge,
    .ripple-task-pill,
    .ripple-task-detail,
    .ripple-task-ring {
      animation: none;
    }
    :global(.ripple-task-rows .ripple-task-retry) {
      animation: none;
    }
    .ripple-task-panel {
      transition: none;
    }
  }
</style>
