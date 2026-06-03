<!--
  src/lib/widgets/input/CheckboxGroup.svelte
  @file widgets/input/CheckboxGroup.svelte
  @description Multi-select checkbox group with Fluid Functionalism's signature
    "moving highlight" — a single background element that GLIDES between items as
    you hover, plus merged backgrounds that span contiguous checked runs. Ported
    faithfully from FF (github.com/mickadesign/fluid-functionalism, MIT).

    The hover highlight + focus ring are now driven by the GENERIC
    `movingIndicator` primitive (src/lib/motion/moving-indicator.ts) — the same
    measure-and-spring-highlight this widget originally implemented internally,
    extracted so tabs / segmented controls / menus reuse it. Each indicator is a
    `use:movingIndicator` action that measures the active item's transform-immune
    offset box and glides the box via inline top/left/width/height on an FF spring
    token (hover = `fast` 80ms; focus ring = `fast` too). The widget still owns
    the active-index hover tracking (FF's useProximityHover nearest-on-y logic)
    and the merged-run geometry — the latter fed by the SAME measure loop via the
    primitive's `onMeasure` hook, so there is one measure pass, not two.

    HOVER-ON-SELECTED RULE (the bug fix): the hover highlight tracks ONLY
    UNSELECTED rows. Hovering a row that is inside the merged selected block shows
    NO separate hover highlight (previously a `bg-muted` box painted on top of the
    `bg-accent` selected block — a doubled highlight). The hover indicator's
    `active` resolver returns the active index only when that row is UNCHECKED,
    else null → the highlight hides. The merged selected background still dims to
    0.8 while an unchecked row is hovered (FF parity: the hover action reads as the
    foreground, the selection recedes). This matches FF's visible outcome — FF's
    hover + selected are low-opacity same-color overlays that never read as
    doubled; we get the same crisp result with our solid theme tokens by gating
    the hover highlight off selected rows outright.

    NOTE on top/left/width/height vs transform: the usual perf guardrail says
    "animate transform/opacity only." Here we animate the positional box ON
    PURPOSE — it's exactly what FF does, and it's the correct choice: the
    highlight must morph its WIDTH/HEIGHT to each item's rect (items can differ in
    width), and a translate+scale would warp the rounded corners and any contents.
    The cost is bounded: a handful of items, pointer-driven (never scroll/looped),
    with `will-change` hinting the compositor. Faithful feel beats the rule here.
  @provenance Mechanism + timing ported from Fluid Functionalism's checkbox-group
    (github.com/mickadesign/fluid-functionalism, MIT). FF drives the highlight via
    Framer Motion springing top/left/width/height of an absolutely-positioned
    motion.div between measured item rects; we reproduce the identical glide with a
    CSS transition on those same properties using our FF-tuned tokens, now through
    the shared `movingIndicator` action. Contiguous-run merging, nearest-on-axis
    active detection, variable-font-weight labels, and the focus ring stay
    faithful to the FF source.
  @created 2026-05-30 — RFC 12 premium pack: FF checkbox-group port (PR #45).
  @changes
    - 2026-05-30 (RFC 12 moving-indicator): refactored the hover highlight + focus
      ring onto the generic `movingIndicator` primitive (DRY). FIXED the doubled-
      highlight bug — the hover highlight no longer paints inside the merged
      selected block; it tracks UNSELECTED rows only (FF's hover-on-selected rule).
-->

<script lang="ts">
  import { Checkbox as CheckboxPrimitive } from '$lib/components/ui/checkbox/index.js';
  import { cn } from '$lib/utils.js';
  import { canonicalOptions } from '$lib/utils/safe-props.js';
  import { FF_SPRING_TOKENS, ffTokenToCssTiming } from '$lib/motion/presets.js';
  import { movingIndicator, type IndicatorRect } from '$lib/motion/moving-indicator.js';

  type Option = { value: string | number; label: string; disabled?: boolean };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    /** Options to show. Strings or { value, label, disabled }. */
    options?: (string | Option)[];
    /** Array of checked values. Bind via `bind: "<state-path>"`. */
    value?: (string | number)[];
    disabled?: boolean;
    onchange?: (value: (string | number)[]) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    options: rawOptions = [],
    value = [],
    disabled = false,
    onchange
  }: Props = $props();

  const options = $derived(
    canonicalOptions(rawOptions, { widget: 'checkbox-group', key: 'options' }) as Option[]
  );

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const checked = $derived(Array.isArray(value) ? value : []);
  const checkedSet = $derived(new Set(checked));
  /** Set of CHECKED indices — drives the merged-background runs (FF parity). */
  const checkedIndices = $derived(
    new Set(options.map((o, i) => (checkedSet.has(o.value) ? i : -1)).filter((i) => i >= 0))
  );

  // ── Timing — read straight from OUR motion primitive's FF tokens ──────────
  // FF drives the hover highlight with springs.fast (80ms, no bounce) and the
  // merged-selection background with springs.moderate (160ms, bounce 0.15). The
  // hover highlight + focus ring now glide via the shared `movingIndicator`
  // action (which times itself from the FF token we hand it). The MERGED runs are
  // N boxes (one per contiguous run), not a single moving box, so they keep their
  // own CSS transition string here, on the moderate (160ms) overshoot timing.
  const HOVER = ffTokenToCssTiming(FF_SPRING_TOKENS.fast); // { 80, decelerate } — label color
  const MERGED = ffTokenToCssTiming(FF_SPRING_TOKENS.moderate); // { 160, overshoot }
  const mergedGlide = `top ${MERGED.durationMs}ms ${MERGED.easing}, left ${MERGED.durationMs}ms ${MERGED.easing}, width ${MERGED.durationMs}ms ${MERGED.easing}, height ${MERGED.durationMs}ms ${MERGED.easing}, opacity 80ms ${HOVER.easing}`;

  // ── Item rect measurement ─────────────────────────────────────────────────
  // The `movingIndicator` action measures internally to POSITION the hover
  // highlight + focus ring. The widget keeps its OWN lightweight measure for two
  // distinct geometry consumers the indicators don't serve: (a) the nearest-on-y
  // HIT TEST that maps the cursor → activeIndex, which must have item boxes
  // BEFORE any indicator mounts; (b) the MERGED-run spans (N boxes, not a moving
  // indicator). Both read the same transform-immune offset* boxes the primitive
  // uses, so the geometry is identical — they're just different readers.
  type Rect = IndicatorRect;

  let container: HTMLDivElement | null = $state(null);
  const itemEls: (HTMLElement | null)[] = [];
  let itemRects = $state<Rect[]>([]);
  let activeIndex = $state<number | null>(null);
  let focusedIndex = $state<number | null>(null);
  let prefersReduced = $state(false);
  let frame = 0;

  function measure() {
    const rects: Rect[] = [];
    for (let i = 0; i < itemEls.length; i++) {
      const el = itemEls[i];
      if (el) rects[i] = { top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight };
    }
    itemRects = rects;
  }

  // Re-measure whenever the option set changes (and once on mount). $effect runs
  // after the DOM updates, so itemEls are populated. SSR-safe: $effect is
  // client-only, and itemRects starts [] so SSR paints no highlight (correct —
  // the highlight is a hover affordance, not initial content).
  $effect(() => {
    void options.length; // re-run when the list changes
    measure();
  });

  $effect(() => {
    // jsdom (unit tests) and older runtimes may not implement matchMedia — guard
    // so the widget renders without a layout/media engine. Defaults to motion on.
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReduced = mq.matches;
    const onChange = () => (prefersReduced = mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  });

  // Nearest-on-y-axis active detection (FF parity): prefer the item the cursor
  // is vertically inside; fall back to the closest item center. rAF-throttled.
  function onPointerMove(e: PointerEvent) {
    if (disabled || !container) return;
    if (frame) return;
    const y = e.clientY;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      let containing: number | null = null;
      let closest: number | null = null;
      let closestDist = Infinity;
      for (let i = 0; i < itemRects.length; i++) {
        const r = itemRects[i];
        if (!r) continue;
        const start = cRect.top + r.top;
        const end = start + r.height;
        if (y >= start && y <= end) containing = i;
        const dist = Math.abs(y - (start + r.height / 2));
        if (dist < closestDist) { closestDist = dist; closest = i; }
      }
      activeIndex = containing ?? closest;
    });
  }

  function onPointerLeave() {
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    activeIndex = null;
  }

  // ── Contiguous-run merging (FF's signature merged backgrounds) ────────────
  // Group adjacent checked indices into runs, then render ONE background per run
  // spanning from the first item's top to the last item's bottom.
  const mergedRuns = $derived.by(() => {
    const sorted = [...checkedIndices].sort((a, b) => a - b);
    const runs: { start: number; end: number }[] = [];
    for (const idx of sorted) {
      const last = runs[runs.length - 1];
      if (last && idx === last.end + 1) last.end = idx;
      else runs.push({ start: idx, end: idx });
    }
    return runs
      .map((run) => {
        const s = itemRects[run.start];
        const e = itemRects[run.end];
        if (!s || !e) return null;
        return {
          key: `${run.start}-${run.end}`,
          top: s.top,
          left: Math.min(s.left, e.left),
          width: Math.max(s.width, e.width),
          height: e.top + e.height - s.top
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  });

  // FF dims the merged background to 0.8 while hovering an UNchecked item, so the
  // hover highlight reads as the foreground action.
  const hoveringUnchecked = $derived(activeIndex !== null && !checkedIndices.has(activeIndex));
  // THE BUG FIX (hover-on-selected rule): the hover highlight tracks UNSELECTED
  // rows only. When the cursor is over a CHECKED row (inside the merged selected
  // block) this resolves to null → the moving indicator hides, so no doubled
  // highlight paints inside the selection. Fed to the hover indicator's `active`.
  const hoverActiveIndex = $derived(hoveringUnchecked ? activeIndex : null);

  // Enumerate the item elements for the indicators (re-read each apply).
  const enumerateItems = () => itemEls;

  function toggle(opt: Option, i: number) {
    if (disabled || opt.disabled) return;
    const next = checkedSet.has(opt.value)
      ? checked.filter((v) => v !== opt.value)
      : [...checked, opt.value];
    onchange?.(next);
  }

  function onItemKeydown(e: KeyboardEvent, opt: Option, i: number) {
    const items = itemEls.filter((el): el is HTMLElement => !!el);
    const here = items.indexOf(e.currentTarget as HTMLElement);
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle(opt, i);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (here === -1) return;
      const n = e.key === 'ArrowDown' ? (here + 1) % items.length : (here - 1 + items.length) % items.length;
      items[n]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  }
</script>

<div class={cn('flex flex-col gap-1.5', className)} style={styleString}>
  {#if label}
    <span class="text-sm font-medium leading-none">{label}</span>
  {/if}

  <div
    bind:this={container}
    {id}
    role="group"
    aria-label={label}
    class={cn('relative flex flex-col w-72 max-w-full select-none', disabled && 'opacity-60')}
    onpointermove={onPointerMove}
    onpointerleave={onPointerLeave}
  >
    <!-- Merged selected backgrounds (one per contiguous checked run). Behind the
         items (z-0). top/left/width/height glide via the MERGED (160ms) timing.
         These are N boxes (one per run), so they stay a manual transition rather
         than the single-box moving indicator. -->
    {#each mergedRuns as run (run.key)}
      <div
        class="absolute rounded-2xl bg-accent pointer-events-none z-0"
        style="top:{run.top}px; left:{run.left}px; width:{run.width}px; height:{run.height}px; opacity:{hoveringUnchecked ? 0.8 : 1}; transition:{prefersReduced ? 'none' : mergedGlide}; will-change:top,left,width,height;"
        data-checkbox-group-merged
      ></div>
    {/each}

    <!-- Hover highlight — the single element that GLIDES between UNSELECTED rows,
         driven by the generic movingIndicator primitive. It mounts only while an
         UNCHECKED row is active (hoverActiveIndex !== null), so it never paints
         inside the merged selected block (the doubled-highlight bug fix). The
         primitive measures the active row's offset box and glides this element's
         top/left/width/height to it on the FF `fast` (80ms) token. -->
    {#if hoverActiveIndex !== null}
      <div
        class="absolute rounded-[20px] bg-muted pointer-events-none z-0"
        data-checkbox-group-highlight
        use:movingIndicator={{
          container: () => container,
          items: enumerateItems,
          active: hoverActiveIndex,
          token: FF_SPRING_TOKENS.fast,
          axis: 'both',
          reducedMotion: prefersReduced
        }}
      ></div>
    {/if}

    <!-- Focus ring — sits 2px OUTSIDE the focused item (inset: -2), also glides on
         the FF `fast` token via the same primitive. Mounts only while focused. -->
    {#if focusedIndex !== null}
      <div
        class="absolute rounded-[22px] pointer-events-none z-20 border border-[hsl(var(--ring))]"
        data-checkbox-group-focus
        use:movingIndicator={{
          container: () => container,
          items: enumerateItems,
          active: focusedIndex,
          token: FF_SPRING_TOKENS.fast,
          axis: 'both',
          inset: -2,
          reducedMotion: prefersReduced
        }}
      ></div>
    {/if}

    {#each options as opt, i (opt.value)}
      {@const isChecked = checkedSet.has(opt.value)}
      {@const isActive = activeIndex === i}
      {@const itemDisabled = disabled || opt.disabled}
      <div
        bind:this={itemEls[i]}
        data-checkbox-group-item={i}
        role="checkbox"
        aria-checked={isChecked}
        aria-label={opt.label}
        aria-disabled={itemDisabled}
        tabindex={itemDisabled ? -1 : 0}
        class={cn(
          'relative z-10 flex items-center gap-2.5 rounded-[20px] px-3 py-1.5 outline-none',
          itemDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        )}
        onclick={() => toggle(opt, i)}
        onkeydown={(e) => onItemKeydown(e, opt, i)}
        onfocus={(e) => { activeIndex = i; focusedIndex = (e.currentTarget as HTMLElement).matches(':focus-visible') ? i : null; }}
        onblur={(e) => { if (container?.contains(e.relatedTarget as Node)) return; focusedIndex = null; activeIndex = null; }}
      >
        <!-- Box — our shared Checkbox primitive (atomic block) for a11y. tabindex
             -1 + aria-hidden: the ROW owns focus + keyboard, the box is visual. -->
        <span class="pointer-events-none shrink-0">
          <CheckboxPrimitive
            checked={isChecked}
            disabled={itemDisabled}
            tabindex={-1}
            aria-hidden="true"
          />
        </span>

        <!-- Label — variable-font-weight + color transition over 80ms (FF parity):
             normal (wght 400) → semibold (wght 550) when checked; muted → fg when
             checked or active. The invisible bold twin reserves width so the
             weight bump never reflows the row. -->
        <span class="inline-grid text-[13px] leading-none">
          <span class="col-start-1 row-start-1 invisible" aria-hidden="true" style="font-variation-settings:'wght' 550;">{opt.label}</span>
          <span
            class="col-start-1 row-start-1"
            style="font-variation-settings:'wght' {isChecked ? 550 : 400}; color:{isChecked || isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}; transition:color 80ms {HOVER.easing}, font-variation-settings 80ms {HOVER.easing};"
          >{opt.label}</span>
        </span>
      </div>
    {/each}
  </div>
</div>
