<!--
  @file widgets/ai/RecommendationCard.svelte
  @description NEW (beautiful-ui re-skin arc, skin-context lane, 2026-09-17). An
    agent's suggestion, put as a question: "Want me to place this restock order?"
    Below the question is the recommendation as a sentence with inline chips (an
    entity with a monogram, a tinted value). The footer has a three-bar
    confidence meter with its label, then Alternatives and Accept. Alternatives
    opens a drawer of the other options, and picking one promotes it.

    WHY IT IS NEW. ApprovalGate is the other decision surface, but its contract is
    a yes/no `decision` persisted through `bind`. A recommendation picks among N
    options, each with its own confidence, so folding this into ApprovalGate
    would change its shape. What they share is the footer: the same hand-rolled
    pill buttons, so the two read as one family. Ripple's `Button` isn't used
    because Alternatives is a disclosure and needs `aria-expanded`, a prop Button
    doesn't have. The inline chips compose `Chip`.

    CONFIDENCE. `signal` is 0–3 lit bars, the source's scale. The tone and the
    default label come from it: 3 is success "High confidence", 2 is warning
    "Needs review", 1 is warning "Low confidence", 0 is unlit "No signal". The
    label is always rendered, so the meter never relies on colour; the bars are
    `aria-hidden`.

    CONTRAST. Tone text on a tone tint is the tone mixed 55% toward
    surface-foreground, not the raw token. Raw `--ripple-success` on its own 10%
    tint is 2.12:1 on a light ground; the mix is 5.99–6.22 light and 8.6+ dark.
    Measurements are in the skin-context status file.

    FROM THE SOURCE, CHANGED. `body` was a ReactNode, and here it is a segment list
    (`text` / `entity` / `value`) a spec can carry. `tone: "var(--green)"` is
    derived from `signal` rather than passed. `ctaVariant` is dropped: Accept is
    always the accent fill, because the source's ink-filled "primary" puts
    surface-coloured text on it and that surface is translucent on glass. The
    title moves out of `labels` to a top-level prop, as ApprovalGate's is.
    "Accepted" is a success tint with a check rather than a solid green fill,
    because white on `--ripple-success` is 2.31:1.

    NOT REGISTERED, same placement as TaskRows / PromptBar / AnswerBlock: under
    `widgets/ai/`, exported from `src/lib/ui/index.ts` only, so the manifest
    still reports 189 widgets. There is no bind surface either: it raises events
    and the host decides what accepting means.
  @a11y A group named by the question. Alternatives is a real button with
    aria-expanded and aria-controls, and the drawer is `inert` while closed.
    Every option is a button. Accepting is announced through a polite live
    region. Transitions and the body fade stop under prefers-reduced-motion.
  origin: slev12397/beautiful-ui@ff0f74d components/primitives/RecommendationCard.tsx
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Chip from '$lib/widgets/display/Chip.svelte';
  import CheckIcon from '@lucide/svelte/icons/check';

  type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'accent';

  /** One run of the recommendation sentence. Set exactly one of text / entity / value. */
  interface RecommendationSegment {
    text?: string;
    /** An entity chip: a monogram and this name, e.g. a supplier. */
    entity?: string;
    /** Avatar image for the entity's monogram. */
    image?: string;
    /** CSS colour behind the entity's monogram. */
    color?: string;
    /** A value chip, e.g. "7 days". */
    value?: string;
    /** Tint for the value chip. Defaults to neutral. */
    tone?: Tone;
  }

  interface RecommendationOption {
    key: string;
    body: RecommendationSegment[];
    /** One-line version for the alternatives list. Defaults to the body's plain text. */
    short?: string;
    /** Confidence as lit bars, 0–3. Defaults to 0. */
    signal?: number;
    /** Confidence label. Defaults by signal. */
    label?: string;
    /** Accept button text for this option. Defaults to `labels.accept`. */
    cta?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** The question the agent is asking. */
    title?: string;
    options?: RecommendationOption[];
    /** Index of the option shown first. */
    selected?: number;
    labels?: { alternatives?: string; otherOptions?: string; accept?: string; accepted?: string };
    /** The shown option was accepted. Fires once per option until another is picked. */
    onaccept?: (detail: { key: string; index: number }) => void;
    /** An alternative was promoted to the recommendation. */
    onselect?: (detail: { key: string; index: number }) => void;
    /** The alternatives drawer was opened or closed. */
    ontogglealternatives?: (open: boolean) => void;
  }

  let {
    id,
    class: className,
    style,
    title = 'Want me to go ahead?',
    options = [],
    selected = 0,
    labels,
    onaccept,
    onselect,
    ontogglealternatives,
  }: Props = $props();

  const CONFIDENCE = [
    { tone: 'none', label: 'No signal' },
    { tone: 'warning', label: 'Low confidence' },
    { tone: 'warning', label: 'Needs review' },
    { tone: 'success', label: 'High confidence' },
  ] as const;
  const BAR = { none: 'bg-ripple-border', warning: 'bg-ripple-warning', success: 'bg-ripple-success' };

  function confidence(option: RecommendationOption) {
    const signal = Math.max(0, Math.min(3, Math.round(Number(option.signal) || 0)));
    return { signal, tone: CONFIDENCE[signal].tone, label: option.label ?? CONFIDENCE[signal].label };
  }

  // Literal class strings so Tailwind's scanner sees every one.
  const VALUE_TONE: Record<Tone, { variant: 'default' | 'success' | 'warning' | 'destructive' | 'primary'; cls: string }> = {
    neutral: {
      variant: 'default',
      cls: 'ring-ripple-border text-[color-mix(in_oklab,var(--ripple-muted-foreground)_80%,var(--ripple-surface-foreground))]',
    },
    success: {
      variant: 'success',
      cls: 'ring-ripple-success/25 text-[color-mix(in_oklab,var(--ripple-success)_55%,var(--ripple-surface-foreground))]',
    },
    warning: {
      variant: 'warning',
      cls: 'ring-ripple-warning/25 text-[color-mix(in_oklab,var(--ripple-warning)_55%,var(--ripple-surface-foreground))]',
    },
    error: {
      variant: 'destructive',
      cls: 'ring-ripple-error/25 text-[color-mix(in_oklab,var(--ripple-error)_55%,var(--ripple-surface-foreground))]',
    },
    accent: {
      variant: 'primary',
      cls: 'ring-ripple-accent/25 text-[color-mix(in_oklab,var(--ripple-accent)_55%,var(--ripple-surface-foreground))]',
    },
  };

  const plain = (option: RecommendationOption) =>
    option.body.map((s) => s.text ?? s.entity ?? s.value ?? '').join('').trim();

  // svelte-ignore state_referenced_locally — one-time seed from `selected`.
  let chosen = $state(selected);
  let open = $state(false);
  let acceptedKey = $state<string | null>(null);

  const index = $derived(options[chosen] ? chosen : 0);
  const active = $derived(options[index]);
  const others = $derived(options.map((option, i) => ({ option, i })).filter(({ i }) => i !== index));
  const accepted = $derived(!!active && acceptedKey === active.key);
  const activeConfidence = $derived(active ? confidence(active) : undefined);

  function toggle() {
    open = !open;
    ontogglealternatives?.(open);
  }

  function select(i: number) {
    chosen = i;
    acceptedKey = null;
    onselect?.({ key: options[i].key, index: i });
  }

  function accept() {
    if (!active || accepted) return;
    acceptedKey = active.key;
    onaccept?.({ key: active.key, index });
  }

  const uid = $props.id();
  const titleId = $derived(`${id ?? uid}-title`);
  const panelId = $derived(`${id ?? uid}-alternatives`);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

{#snippet meter(option: RecommendationOption)}
  {@const c = confidence(option)}
  <span class="ripple-rec-meter flex shrink-0 items-end gap-0.5" aria-hidden="true" data-tone={c.tone} data-signal={c.signal}>
    {#each [0, 1, 2] as bar (bar)}
      <span
        data-lit={bar < c.signal}
        class={cn(
          'h-2.5 w-1 rounded-full transition-colors duration-300 ease-ripple-out motion-reduce:transition-none',
          bar < c.signal ? BAR[c.tone] : 'bg-ripple-border'
        )}
      ></span>
    {/each}
  </span>
{/snippet}

{#snippet segment(s: RecommendationSegment)}
  {#if s.entity}<Chip class="mx-0.5 gap-1 rounded-full py-px pr-1.5 pl-[3px] align-middle text-ripple-surface-foreground ring-1 ring-ripple-border"><span aria-hidden="true" class={cn('flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ripple-accent text-[9px] font-semibold leading-none text-ripple-accent-foreground', s.color && 'text-white')} style:background-color={s.color}>{#if s.image}<img src={s.image} alt="" class="size-full object-cover" />{:else}{s.entity.slice(0, 1)}{/if}</span>{s.entity}</Chip>{:else if s.value}{@const t = VALUE_TONE[s.tone ?? 'neutral'] ?? VALUE_TONE.neutral}<Chip variant={t.variant} label={s.value} class={cn('mx-0.5 rounded-full px-1.5 py-[3px] align-middle ring-1', t.cls)} />{:else}{s.text ?? ''}{/if}
{/snippet}

<div
  {id}
  data-ripple-node={id}
  data-variant="default"
  data-state={accepted ? 'accepted' : 'pending'}
  role="group"
  aria-labelledby={titleId}
  class={cn(
    'ripple-recommendation w-full max-w-95 overflow-hidden rounded-ripple bg-ripple-surface ring-1 ring-ripple-border',
    className
  )}
  style={styleString}
>
  <div class="p-3">
    <p id={titleId} class="m-0 text-[14px] font-medium text-ripple-surface-foreground">{title}</p>
    {#if active}
      {#key active.key}
        <p class="ripple-rec-fade-in m-0 mt-1.5 min-h-12 text-[13px] leading-relaxed text-ripple-muted-foreground">{#each active.body as s, i (i)}{@render segment(s)}{/each}</p>
      {/key}
    {/if}
  </div>

  {#if others.length > 0}
    <div
      id={panelId}
      inert={!open}
      class="grid transition-[grid-template-rows,opacity] duration-300 ease-ripple-out motion-reduce:transition-none"
      style:grid-template-rows={open ? '1fr' : '0fr'}
      style:opacity={open ? 1 : 0}
    >
      <div class="overflow-hidden">
        <div class="border-t border-ripple-border p-2">
          <p class="m-0 px-1.5 pb-1 text-[11px] font-medium text-ripple-muted-foreground">
            {labels?.otherOptions ?? 'Other options'}
          </p>
          {#each others as { option, i } (i)}
            {@const c = confidence(option)}
            <button
              type="button"
              onclick={() => select(i)}
              class="flex w-full items-center gap-2.5 rounded-ripple px-1.5 py-1.5 text-left transition-colors duration-100 ease-ripple-out hover:bg-ripple-accent/10"
            >
              {@render meter(option)}
              <span class="min-w-0 flex-1 truncate text-[12.5px] text-ripple-surface-foreground">
                {option.short ?? plain(option)}
              </span>
              <span class="shrink-0 text-[11px] text-ripple-muted-foreground">{c.label}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  {#if active && activeConfidence}
    <div class="flex items-center justify-between gap-3 p-2.5">
      <span class="flex min-w-0 items-center gap-2">
        {@render meter(active)}
        <span class="ripple-rec-label text-[12.5px] font-medium text-ripple-muted-foreground">
          {activeConfidence.label}
        </span>
      </span>

      <span class="-mr-0.5 flex shrink-0 items-center gap-2">
        {#if others.length > 0}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onclick={toggle}
            class="inline-flex items-center rounded-full px-2.5 py-1.5 text-[12.5px] font-medium text-ripple-surface-foreground ring-1 ring-ripple-border transition-colors duration-150 ease-ripple-out hover:bg-ripple-accent/10"
          >
            {labels?.alternatives ?? 'Alternatives'}
          </button>
        {/if}
        <button
          type="button"
          onclick={accept}
          aria-disabled={accepted}
          class={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 ease-ripple-out',
            accepted
              ? 'bg-ripple-success/10 ring-1 ring-ripple-success/25 text-[color-mix(in_oklab,var(--ripple-success)_55%,var(--ripple-surface-foreground))]'
              : 'bg-ripple-accent text-ripple-accent-foreground hover:bg-ripple-accent/90'
          )}
        >
          {#if accepted}
            <CheckIcon size={13} aria-hidden="true" />
            {labels?.accepted ?? 'Accepted'}
          {:else}
            {active.cta ?? labels?.accept ?? 'Accept'}
          {/if}
        </button>
      </span>
    </div>
  {/if}

  <div class="sr-only" aria-live="polite">
    {#if accepted && active}{labels?.accepted ?? 'Accepted'}: {active.short ?? plain(active)}{/if}
  </div>
</div>

<style>
  .ripple-rec-fade-in {
    animation: ripple-rec-fade-in 180ms ease-out both;
  }
  @keyframes ripple-rec-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple-rec-fade-in {
      animation: none;
    }
  }
</style>
