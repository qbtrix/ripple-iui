<!--
  @file widgets/ai/FineTuneCard.svelte
  @description NEW (beautiful-ui re-skin arc, skin-selection lane, 2026-09-17).
    A compact inspector: a titled card with an Adjust action, a three-way layout
    toggle, number fields (W / H / Radius / Opacity by default) and a Type
    select. Every value is `$bindable` and settable from props, because the
    agent is the one adjusting them; every user edit raises `onchange` with the
    whole state.

    NOT REGISTERED, same placement rule as TaskRows, PromptBar and AnswerBlock:
    under `widgets/ai/`, re-exported from `src/lib/ui/index.ts`, no registry or
    manifest entry, so the manifest still reports 189 widgets.

    COMPOSED, NOT RE-DERIVED. Card is the frame. Segmented is the layout toggle.
    Input (`type="number"`, size sm) is every field, with the field name in its
    `prefix` slot and the unit in `suffix`. Select is the Type picker, Button
    the Adjust action, Shimmer its label. This file owns the layout, the
    clamping, the scrub gesture and one keyframe.

    CHANGED FROM THE SOURCE, and why:
    - Layout segments carry visible labels ("Row" / "Column" / "Grid") next to
      their icons. Segmented always renders the option label and has no
      per-option aria-label, so an icon-only segment would have no accessible
      name. The card is max-w-72 rather than max-w-60 so the labels fit.
    - `layout` is a string ('row' | 'column' | 'grid'), not the source's
      segment index. An agent writing `layout: 'grid'` is legible; `segment: 2`
      is not.
    - Adjust is a real button raising `onadjust`. In the source it is a
      decorative shimmer that turns into "Edited" once anything changes; here
      the shimmer stays on the label until the first edit, and "Edited" appears
      beside the button rather than replacing it, so the action never vanishes.
    - Fields keep the source's scrub (drag the field name sideways) and its
      Shift+Arrow ×10 step. Plain ↑/↓ comes from the native number input.
      Typing is only committed while in range; blur clamps.
    - The Type menu is the Select canonical, not the source's hand-rolled
      absolutely-positioned list.
    - Dropped: every box-shadow (glass), the edited field's accent fill
      (Input's shell is not restyleable from outside; the field name brightens
      from muted to foreground instead), `variant` (unused in the source).
  @a11y Each number input is named by its visible prefix through a real
    `<label for>`, so "W" and "Radius" are the accessible names, not decoration.
    The Type trigger is named by its own `<label for>`. The layout radiogroup
    sits in a group named by the "Layout" heading. Ids come from `$props.id()`.
    The "Edited" pop-in freezes under prefers-reduced-motion, and Shimmer and
    Segmented carry their own guards.
  origin: slev12397/beautiful-ui@ff0f74d components/primitives/FineTuneCard.tsx
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Card from '$lib/widgets/layout/Card.svelte';
  import Segmented from '$lib/widgets/input/Segmented.svelte';
  import Input from '$lib/widgets/input/Input.svelte';
  import Select from '$lib/widgets/input/Select.svelte';
  import Button from '$lib/widgets/input/Button.svelte';
  import Shimmer from '$lib/widgets/premium/Shimmer.svelte';
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import CheckIcon from '@lucide/svelte/icons/check';

  interface FineTuneField {
    key: string;
    /** Visible prefix and accessible name, e.g. "W" or "Radius". */
    label: string;
    /** The default. A field whose value differs from this counts as edited. */
    value: number;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
  }

  interface FineTuneLabels {
    title: string;
    layout: string;
    type: string;
    placeholder: string;
    adjust: string;
    edited: string;
  }

  interface FineTuneState {
    layout: string;
    values: Record<string, number>;
    type: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** The number fields, laid out two per row. */
    fields?: FineTuneField[];
    /** Current field values by key. Missing keys fall back to the field default. */
    values?: Record<string, number>;
    /** 'row' | 'column' | 'grid'. */
    layout?: string;
    /** Choices for the Type select. */
    options?: string[];
    /** Selected type. Empty shows the placeholder. */
    type?: string;
    labels?: Partial<FineTuneLabels>;
    onchange?: (state: FineTuneState) => void;
    onadjust?: (state: FineTuneState) => void;
  }

  const FIELDS: FineTuneField[] = [
    { key: 'width', label: 'W', value: 324, min: 40, max: 999 },
    { key: 'height', label: 'H', value: 96, min: 24, max: 999 },
    { key: 'radius', label: 'Radius', value: 28, min: 0, max: 64 },
    { key: 'opacity', label: 'Opacity', value: 100, min: 0, max: 100, suffix: '%' },
  ];

  const LAYOUTS = [
    { value: 'row', label: 'Row', icon: 'columns-3' },
    { value: 'column', label: 'Column', icon: 'rows-2' },
    { value: 'grid', label: 'Grid', icon: 'layout-grid' },
  ];

  let {
    id,
    class: className,
    style,
    fields = FIELDS,
    values = $bindable({}),
    layout = $bindable('row'),
    options = ['Seasonal', 'Classic', 'Limited'],
    type = $bindable(''),
    labels,
    onchange,
    onadjust,
  }: Props = $props();

  const text = $derived({
    title: 'Flavor card',
    layout: 'Layout',
    type: 'Type',
    placeholder: 'Select type',
    adjust: 'Adjust',
    edited: 'Edited',
    ...labels,
  });

  const uid = $props.id();
  const base = $derived(id ?? `ripple-finetune-${uid}`);

  const current = (f: FineTuneField) => values?.[f.key] ?? f.value;
  const clamp = (f: FineTuneField, n: number) => Math.min(f.max, Math.max(f.min, Math.round(n)));

  const edited = $derived(
    layout !== LAYOUTS[0].value || type !== '' || fields.some((f) => current(f) !== f.value)
  );

  const snapshot = (): FineTuneState => ({
    layout,
    values: Object.fromEntries(fields.map((f) => [f.key, current(f)])),
    type,
  });

  function setValue(f: FineTuneField, n: number) {
    if (current(f) === n) return;
    values = { ...values, [f.key]: n };
    onchange?.(snapshot());
  }

  function setLayout(next: unknown) {
    layout = String(next);
    onchange?.(snapshot());
  }

  function setType(next: unknown) {
    type = String(next ?? '');
    onchange?.(snapshot());
  }

  /* Scrub: drag the field name sideways, one step per 2px, as the source does. */
  let drag: { x: number; v: number } | null = null;

  function scrubStart(e: PointerEvent, f: FineTuneField) {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag = { x: e.clientX, v: current(f) };
  }

  function scrubMove(e: PointerEvent, f: FineTuneField) {
    if (!drag) return;
    setValue(f, clamp(f, drag.v + ((e.clientX - drag.x) / 2) * (f.step ?? 1)));
  }

  /* Shift+Arrow steps by ten. Prevented on the wrapper during bubbling, which
     still cancels the native number-input step. */
  function onFieldKeydown(e: KeyboardEvent, f: FineTuneField) {
    if (!e.shiftKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const dir = e.key === 'ArrowUp' ? 1 : -1;
    setValue(f, clamp(f, current(f) + dir * 10 * (f.step ?? 1)));
  }
</script>

<Card {id} {style} class={cn('ripple-finetune w-full max-w-72 gap-0 p-0', className)}>
  <div class="flex items-center justify-between gap-2 border-b border-ripple-border py-1.5 pr-1.5 pl-3">
    <span class="min-w-0 truncate text-[13px] font-medium text-ripple-surface-foreground">{text.title}</span>
    <span class="flex shrink-0 items-center gap-1">
      {#if edited}
        <span class="ripple-finetune-edited flex items-center gap-1 text-[12px] font-medium text-ripple-muted-foreground">
          <CheckIcon size={12} strokeWidth={3} class="text-ripple-success-text" aria-hidden="true" />
          {text.edited}
        </span>
      {/if}
      <Button variant="ghost" size="sm" onclick={() => onadjust?.(snapshot())}>
        {#snippet leading()}<SparklesIcon size={13} aria-hidden="true" />{/snippet}
        {#if edited}{text.adjust}{:else}<Shimmer>{text.adjust}</Shimmer>{/if}
      </Button>
    </span>
  </div>

  <div class="flex flex-col gap-2 border-b border-ripple-border p-3">
    <div role="group" aria-labelledby={`${base}-layout`} class="flex flex-col gap-2">
      <p id={`${base}-layout`} class="text-[12.5px] font-medium text-ripple-surface-foreground">{text.layout}</p>
      <Segmented
        size="sm"
        options={LAYOUTS}
        value={layout}
        onchange={setLayout}
        class="[&_[role=radiogroup]]:w-full"
      />
    </div>

    <div class="grid min-w-0 grid-cols-2 gap-2">
      {#each fields as f (f.key)}
        {@const fid = `${base}-${f.key}`}
        {#snippet name()}
          <label
            for={fid}
            onpointerdown={(e) => scrubStart(e, f)}
            onpointermove={(e) => scrubMove(e, f)}
            onpointerup={() => (drag = null)}
            onpointercancel={() => (drag = null)}
            class={cn(
              'cursor-ew-resize touch-none select-none text-[12px]',
              current(f) !== f.value ? 'text-ripple-surface-foreground' : 'text-ripple-muted-foreground'
            )}
          >
            {f.label}
          </label>
        {/snippet}
        {#snippet unit()}
          <span class="text-[11.5px] text-ripple-muted-foreground">{f.suffix}</span>
        {/snippet}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="min-w-0" onkeydown={(e) => onFieldKeydown(e, f)}>
          <Input
            id={fid}
            type="number"
            size="sm"
            value={current(f)}
            prefix={name}
            suffix={f.suffix ? unit : undefined}
            class="min-w-0 tabular-nums"
            oninput={(v) => {
              if (typeof v === 'number' && v >= f.min && v <= f.max) setValue(f, v);
            }}
            onblur={(e) => {
              const input = e.target as HTMLInputElement;
              const n = clamp(f, Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : current(f));
              setValue(f, n);
              input.value = String(n);
            }}
          />
        </div>
      {/each}
    </div>
  </div>

  <div class="flex items-center justify-between gap-2 py-2 pr-2 pl-3">
    <label for={`${base}-type`} class="text-[12px] text-ripple-muted-foreground">{text.type}</label>
    <Select
      id={`${base}-type`}
      value={type}
      placeholder={text.placeholder}
      {options}
      onchange={setType}
      class="w-32 text-[12px]"
    />
  </div>
</Card>

<style>
  /* Input's shell is a closed tv(); the native spinners are the one thing a
     number field here must lose, so reach it structurally. */
  :global(.ripple-finetune input[type='number']) {
    appearance: textfield;
    -moz-appearance: textfield;
  }
  :global(.ripple-finetune input[type='number']::-webkit-inner-spin-button),
  :global(.ripple-finetune input[type='number']::-webkit-outer-spin-button) {
    -webkit-appearance: none;
    margin: 0;
  }

  .ripple-finetune-edited {
    animation: ripple-finetune-pop-in 250ms var(--ripple-ease-out) both;
  }
  @keyframes ripple-finetune-pop-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple-finetune-edited {
      animation: none;
    }
  }
</style>
