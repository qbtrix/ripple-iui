<!--
  src/lib/widgets/input/CheckboxGroup.svelte
  @file widgets/input/CheckboxGroup.svelte
  @description Multi-select checkbox group with Fluid Functionalism's signature
    "moving highlight" — a single background element that GLIDES between items as
    you hover, plus merged backgrounds that span contiguous checked runs. Ported
    faithfully from FF (github.com/mickadesign/fluid-functionalism, MIT). The
    glide is reproduced on OUR motion primitive: a CSS transition on the
    highlight's top/left/width/height, timed by `ffTokenToCssTiming` reading the
    FF spring TOKENS (`FF_SPRING_TOKENS.fast` 80ms for the hover glide,
    `.moderate` 160ms for the merged-selection morph). No JS animation engine is
    imported — the whole interaction is positional CSS transition + an active-
    index hover tracker (FF's useProximityHover logic, ported component-internal).
  @provenance Mechanism + timing ported from Fluid Functionalism's checkbox-group
    (github.com/mickadesign/fluid-functionalism, MIT). FF drives the highlight via
    Framer Motion springing top/left/width/height of an absolutely-positioned
    motion.div between measured item rects; we reproduce the identical glide with a
    CSS transition on those same properties using our FF-tuned tokens. Item rects,
    contiguous-run merging, nearest-on-axis active detection, variable-font-weight
    labels, and the focus ring are all faithful to the FF source.
  @created 2026-05-30 — RFC 12 premium pack: FF checkbox-group port (PR #45).
-->
<script lang="ts">
  import { Checkbox as CheckboxPrimitive } from '$lib/components/ui/checkbox/index.js';
  import { cn } from '$lib/utils.js';
  import { canonicalOptions } from '$lib/utils/safe-props.js';
  import { FF_SPRING_TOKENS, ffTokenToCssTiming } from '$lib/motion/presets.js';

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
  // merged-selection background with springs.moderate (160ms, bounce 0.15). We
  // map those tokens to a CSS transition that HONORS the authored duration via
  // ffTokenToCssTiming — the sub-100ms snap IS the "Apple-level" feel.
  const HOVER = ffTokenToCssTiming(FF_SPRING_TOKENS.fast); // { 80, decelerate }
  const MERGED = ffTokenToCssTiming(FF_SPRING_TOKENS.moderate); // { 160, overshoot }
  // The properties that GLIDE. Animating top/left/width/height (NOT transform)
  // is what makes the highlight travel between item rects — exactly FF's choice.
  const hoverGlide = `top ${HOVER.durationMs}ms ${HOVER.easing}, left ${HOVER.durationMs}ms ${HOVER.easing}, width ${HOVER.durationMs}ms ${HOVER.easing}, height ${HOVER.durationMs}ms ${HOVER.easing}, opacity 80ms ${HOVER.easing}`;
  const mergedGlide = `top ${MERGED.durationMs}ms ${MERGED.easing}, left ${MERGED.durationMs}ms ${MERGED.easing}, width ${MERGED.durationMs}ms ${MERGED.easing}, height ${MERGED.durationMs}ms ${MERGED.easing}, opacity 80ms ${HOVER.easing}`;

  // ── Item rect measurement (FF's useProximityHover, component-internal) ────
  // FF measures each item's offset box (transform-immune) and tracks an
  // activeIndex = the item the cursor is over, else the nearest on the y-axis.
  // We port that exactly: the highlight reads itemRects[activeIndex] and its CSS
  // transition glides it from the previous rect to the new one.
  interface Rect { top: number; left: number; width: number; height: number; }

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

  const activeRect = $derived(activeIndex !== null ? itemRects[activeIndex] : null);
  const focusRect = $derived(focusedIndex !== null ? itemRects[focusedIndex] : null);
  // FF dims the merged background to 0.8 while hovering an UNchecked item, so the
  // hover highlight reads as the foreground action.
  const hoveringUnchecked = $derived(activeIndex !== null && !checkedIndices.has(activeIndex));

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
         items (z-0). top/left/width/height glide via the MERGED (160ms) timing. -->
    {#each mergedRuns as run (run.key)}
      <div
        class="absolute rounded-2xl bg-accent pointer-events-none z-0"
        style="top:{run.top}px; left:{run.left}px; width:{run.width}px; height:{run.height}px; opacity:{hoveringUnchecked ? 0.8 : 1}; transition:{prefersReduced ? 'none' : mergedGlide};"
        data-checkbox-group-merged
      ></div>
    {/each}

    <!-- Hover highlight — the single element that GLIDES between items. Reads the
         active item's rect; its CSS transition on top/left/width/height carries
         it from the previous item to the hovered one (FF's moving highlight). -->
    {#if activeRect}
      <div
        class="absolute rounded-[20px] bg-muted pointer-events-none z-0"
        style="top:{activeRect.top}px; left:{activeRect.left}px; width:{activeRect.width}px; height:{activeRect.height}px; transition:{prefersReduced ? 'none' : hoverGlide};"
        data-checkbox-group-highlight
      ></div>
    {/if}

    <!-- Focus ring — sits 2px outside the focused item, also glides (HOVER timing). -->
    {#if focusRect}
      <div
        class="absolute rounded-[22px] pointer-events-none z-20 border border-[hsl(var(--ring))]"
        style="top:{focusRect.top - 2}px; left:{focusRect.left - 2}px; width:{focusRect.width + 4}px; height:{focusRect.height + 4}px; transition:{prefersReduced ? 'none' : hoverGlide};"
        data-checkbox-group-focus
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
