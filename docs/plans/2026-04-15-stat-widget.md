# Stat Widget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `Stat` widget that renders a label + value + delta chip, with `direction` semantics driving color (green/red/neutral) and a lucide arrow icon. Replaces the existing `Metric` widget. Composable into any container, including `Card`'s `header` snippet and `children` body.

**Architecture:** Single Svelte 5 component at `src/lib/widgets/display/Stat.svelte`. Uses `tailwind-variants` for size/direction recipes, `@lucide/svelte` for `ArrowUp` / `ArrowDown` / `Minus` icons, `Intl.NumberFormat` for format (`number` / `currency` / `percent` / `compact`). `Metric` stays on disk (no deprecation in this plan — its removal is a follow-up once call-sites migrate).

**Tech stack:** Svelte 5 runes, Tailwind CSS 4, `tailwind-variants`, `@lucide/svelte`, `@testing-library/svelte`, `vitest`.

**Design reference:** `docs/plans/2026-04-14-basic-widgets-visual-quality-design.md` (the Stat API section).

**Out of scope:** Deleting `Metric.svelte`, migrating call-sites, sparkline rendering (added later — keep API surface ready but don't implement), theme/brand-hue work in `styles.css`.

---

## Task 1: Write failing Stat tests

**Files:**
- Create: `src/lib/widgets/display/Stat.test.ts`

**Step 1 — write tests:**

```ts
import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Stat from '$lib/widgets/display/Stat.svelte';

test('renders label and value', () => {
  render(Stat, { props: { label: 'Revenue', value: 1234 } });
  expect(screen.getByText('Revenue')).toBeInTheDocument();
  expect(screen.getByText('1,234')).toBeInTheDocument();
});

test('formats currency values', () => {
  render(Stat, { props: { value: 1234.5, format: 'currency', currency: 'USD', locale: 'en-US' } });
  expect(screen.getByText('$1,234.50')).toBeInTheDocument();
});

test('formats percent values', () => {
  render(Stat, { props: { value: 0.125, format: 'percent', locale: 'en-US' } });
  expect(screen.getByText('12.5%')).toBeInTheDocument();
});

test('passes string value through untouched', () => {
  render(Stat, { props: { value: '$12,450' } });
  expect(screen.getByText('$12,450')).toBeInTheDocument();
});

test('explicit direction="up" → data-direction=up', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 5, direction: 'up' } });
  expect(container.querySelector('[data-direction="up"]')).not.toBeNull();
});

test('explicit direction="down" → data-direction=down', () => {
  const { container } = render(Stat, { props: { value: 100, delta: -5, direction: 'down' } });
  expect(container.querySelector('[data-direction="down"]')).not.toBeNull();
});

test('direction="auto" with positive delta → up', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 5, direction: 'auto' } });
  expect(container.querySelector('[data-direction="up"]')).not.toBeNull();
});

test('direction="auto" with negative delta → down', () => {
  const { container } = render(Stat, { props: { value: 100, delta: -5, direction: 'auto' } });
  expect(container.querySelector('[data-direction="down"]')).not.toBeNull();
});

test('direction="auto" with zero delta → neutral', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 0, direction: 'auto' } });
  expect(container.querySelector('[data-direction="neutral"]')).not.toBeNull();
});

test('direction defaults to auto', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 5 } });
  expect(container.querySelector('[data-direction="up"]')).not.toBeNull();
});

test('direction="down-good" with positive delta → up visually, but semantic is bad', () => {
  // down-good means "going down is good" (latency, churn, cost)
  // A positive delta is therefore "bad" (red, up arrow)
  const { container } = render(Stat, { props: { value: 200, delta: 5, direction: 'down-good' } });
  const el = container.querySelector('[data-direction]');
  expect(el?.getAttribute('data-direction')).toBe('up');
  expect(el?.getAttribute('data-sentiment')).toBe('negative');
});

test('direction="up-good" with negative delta → down visually, sentiment negative', () => {
  const { container } = render(Stat, { props: { value: 100, delta: -5, direction: 'up-good' } });
  const el = container.querySelector('[data-direction]');
  expect(el?.getAttribute('data-direction')).toBe('down');
  expect(el?.getAttribute('data-sentiment')).toBe('negative');
});

test('direction="up-good" with positive delta → up, sentiment positive', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 5, direction: 'up-good' } });
  const el = container.querySelector('[data-direction]');
  expect(el?.getAttribute('data-direction')).toBe('up');
  expect(el?.getAttribute('data-sentiment')).toBe('positive');
});

test('renders delta chip only when delta or deltaPercent provided', () => {
  const { container: withDelta } = render(Stat, { props: { value: 100, delta: 5 } });
  expect(withDelta.querySelector('[data-slot="stat-delta"]')).not.toBeNull();

  const { container: noDelta } = render(Stat, { props: { value: 100 } });
  expect(noDelta.querySelector('[data-slot="stat-delta"]')).toBeNull();
});

test('size applied as data-size attr', () => {
  const { container } = render(Stat, { props: { value: 100, size: 'lg' } });
  expect(container.querySelector('[data-size="lg"]')).not.toBeNull();
});

test('defaults to size=md', () => {
  const { container } = render(Stat, { props: { value: 100 } });
  expect(container.querySelector('[data-size="md"]')).not.toBeNull();
});

test('renders up arrow icon when direction=up', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 5, direction: 'auto' } });
  // lucide renders <svg class="lucide lucide-arrow-up" ...>
  expect(container.querySelector('.lucide-arrow-up')).not.toBeNull();
});

test('renders down arrow icon when direction=down', () => {
  const { container } = render(Stat, { props: { value: 100, delta: -5, direction: 'auto' } });
  expect(container.querySelector('.lucide-arrow-down')).not.toBeNull();
});

test('renders minus icon when direction=neutral', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 0, direction: 'auto' } });
  expect(container.querySelector('.lucide-minus')).not.toBeNull();
});
```

**Step 2 — run to confirm failures:**
```
bun run test -- --run src/lib/widgets/display/Stat.test.ts
```
Expected: all 18 tests FAIL (file does not exist yet).

**Step 3 — commit:**
```
git add src/lib/widgets/display/Stat.test.ts
git commit -m "test(ripple): Stat widget behavior spec (failing)

Defines contract: value/label rendering, number/currency/percent
format, delta chip, direction semantics (up/down/neutral/auto,
plus up-good / down-good sentiment overrides), size data-attr,
lucide arrow icon mapping."
```

---

## Task 2: Implement Stat.svelte

**Files:**
- Create: `src/lib/widgets/display/Stat.svelte`
- Modify: `src/lib/widgets/display/index.ts` (add Stat export)

**Step 1 — create `src/lib/widgets/display/Stat.svelte`:**

```svelte
<script lang="ts">
  import { tv } from 'tailwind-variants';
  import { cn } from '$lib/utils.js';
  import { ArrowUp, ArrowDown, Minus } from '@lucide/svelte';

  type DirectionInput = 'up' | 'down' | 'neutral' | 'auto' | 'up-good' | 'down-good';
  type DirectionResolved = 'up' | 'down' | 'neutral';
  type Sentiment = 'positive' | 'negative' | 'neutral';

  interface Props {
    id?: string;
    class?: string;
    label?: string;
    value: number | string;
    format?: 'number' | 'currency' | 'percent' | 'compact';
    currency?: string;
    locale?: string;
    precision?: number;
    delta?: number;
    deltaPercent?: number;
    deltaFormat?: 'absolute' | 'percent' | 'both';
    direction?: DirectionInput;
    size?: 'sm' | 'md' | 'lg';
    align?: 'left' | 'right';
  }

  let {
    id,
    class: className,
    label,
    value,
    format = 'number',
    currency = 'USD',
    locale,
    precision,
    delta,
    deltaPercent,
    deltaFormat = 'percent',
    direction = 'auto',
    size = 'md',
    align = 'left',
  }: Props = $props();

  function formatValue(v: number | string): string {
    if (typeof v === 'string') return v;
    const opts: Intl.NumberFormatOptions = {};
    if (precision !== undefined) {
      opts.minimumFractionDigits = precision;
      opts.maximumFractionDigits = precision;
    }
    switch (format) {
      case 'currency':
        opts.style = 'currency';
        opts.currency = currency;
        if (precision === undefined) {
          opts.minimumFractionDigits = 2;
          opts.maximumFractionDigits = 2;
        }
        break;
      case 'percent':
        opts.style = 'percent';
        if (precision === undefined) {
          opts.maximumFractionDigits = 1;
        }
        break;
      case 'compact':
        opts.notation = 'compact';
        break;
    }
    return new Intl.NumberFormat(locale, opts).format(v);
  }

  function resolveDirection(): { dir: DirectionResolved; sentiment: Sentiment } {
    const referenceDelta = delta ?? deltaPercent ?? 0;
    if (direction === 'up') return { dir: 'up', sentiment: 'positive' };
    if (direction === 'down') return { dir: 'down', sentiment: 'negative' };
    if (direction === 'neutral') return { dir: 'neutral', sentiment: 'neutral' };
    if (direction === 'auto') {
      if (referenceDelta > 0) return { dir: 'up', sentiment: 'positive' };
      if (referenceDelta < 0) return { dir: 'down', sentiment: 'negative' };
      return { dir: 'neutral', sentiment: 'neutral' };
    }
    if (direction === 'up-good') {
      if (referenceDelta > 0) return { dir: 'up', sentiment: 'positive' };
      if (referenceDelta < 0) return { dir: 'down', sentiment: 'negative' };
      return { dir: 'neutral', sentiment: 'neutral' };
    }
    // down-good: up = bad, down = good
    if (referenceDelta > 0) return { dir: 'up', sentiment: 'negative' };
    if (referenceDelta < 0) return { dir: 'down', sentiment: 'positive' };
    return { dir: 'neutral', sentiment: 'neutral' };
  }

  function formatDelta(): string {
    const absPart =
      delta !== undefined ? `${delta > 0 ? '+' : ''}${formatValue(delta)}` : '';
    const pctPart =
      deltaPercent !== undefined
        ? `${deltaPercent > 0 ? '+' : ''}${deltaPercent}%`
        : '';
    if (deltaFormat === 'absolute') return absPart || pctPart;
    if (deltaFormat === 'percent') return pctPart || absPart;
    // both
    if (absPart && pctPart) return `${absPart} (${pctPart})`;
    return absPart || pctPart;
  }

  const resolved = $derived(resolveDirection());
  const hasDelta = $derived(delta !== undefined || deltaPercent !== undefined);
  const displayValue = $derived(formatValue(value));
  const displayDelta = $derived(hasDelta ? formatDelta() : '');

  const root = tv({
    base: 'flex flex-col min-w-0',
    variants: {
      size: {
        sm: 'gap-[2px]',
        md: 'gap-1',
        lg: 'gap-1.5',
      },
      align: {
        left: 'items-start text-left',
        right: 'items-end text-right',
      },
    },
    defaultVariants: { size: 'md', align: 'left' },
  });

  const labelCls = tv({
    base: 'text-muted-foreground font-medium',
    variants: {
      size: { sm: 'text-[11px]', md: 'text-xs', lg: 'text-sm' },
    },
    defaultVariants: { size: 'md' },
  });

  const valueCls = tv({
    base: 'font-semibold font-mono tabular-nums leading-tight',
    variants: {
      size: { sm: 'text-sm', md: 'text-xl', lg: 'text-3xl' },
    },
    defaultVariants: { size: 'md' },
  });

  const deltaCls = tv({
    base: 'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
    variants: {
      sentiment: {
        positive: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
        negative: 'text-red-600 bg-red-500/10 dark:text-red-400',
        neutral: 'text-muted-foreground bg-muted',
      },
    },
    defaultVariants: { sentiment: 'neutral' },
  });

  const iconSize = $derived(size === 'sm' ? 12 : size === 'lg' ? 14 : 12);
</script>

<div
  {id}
  class={cn(root({ size, align }), className)}
  data-size={size}
  data-direction={resolved.dir}
  data-sentiment={resolved.sentiment}
>
  {#if label}
    <span class={labelCls({ size })}>{label}</span>
  {/if}
  <div class="flex items-center gap-2 min-w-0">
    <span class={valueCls({ size })}>{displayValue}</span>
    {#if hasDelta}
      <span data-slot="stat-delta" class={deltaCls({ sentiment: resolved.sentiment })}>
        {#if resolved.dir === 'up'}
          <ArrowUp size={iconSize} strokeWidth={2.5} />
        {:else if resolved.dir === 'down'}
          <ArrowDown size={iconSize} strokeWidth={2.5} />
        {:else}
          <Minus size={iconSize} strokeWidth={2.5} />
        {/if}
        <span>{displayDelta}</span>
      </span>
    {/if}
  </div>
</div>
```

**Step 2 — export from display/index.ts:**

Read `src/lib/widgets/display/index.ts`. Add one line:
```ts
export { default as Stat } from './Stat.svelte';
```

**Step 3 — run Stat tests:**
```
bun run test -- --run src/lib/widgets/display/Stat.test.ts
```
Expected: `18 passed | 0 failed`. If any fail, fix the component (not the tests). Re-run until green.

**Step 4 — run full suite:**
```
bun run test -- --run
```
Expected: all existing tests still pass. No regressions.

**Step 5 — typecheck:**
```
bun run check
```
No new errors from `Stat.svelte` or `display/index.ts`.

**Step 6 — commit:**
```
git add src/lib/widgets/display/Stat.svelte src/lib/widgets/display/index.ts
git commit -m "feat(ripple): add Stat widget with direction + delta + lucide arrows

- Props: label, value, format (number/currency/percent/compact),
  delta, deltaPercent, direction (up/down/neutral/auto/up-good/down-good),
  size (sm/md/lg), align
- Green/red/neutral sentiment driven by direction + delta sign
- Lucide ArrowUp/ArrowDown/Minus icons in delta chip
- data-direction and data-sentiment attrs for styling hooks
- Intl.NumberFormat for locale/currency/percent/compact formatting

Ref: docs/plans/2026-04-15-stat-widget.md"
```

---

## Task 3: Add Stat section to the Card showcase + standalone showcase

**Files:**
- Modify: `src/routes/showcase/card/+page.svelte` (update the existing stat-string in the "With header slot" and "Full composition" examples to use the real `<Stat>` widget)
- Create: `src/routes/showcase/stat/+page.svelte`

**Step 1 — update card showcase:**

In `src/routes/showcase/card/+page.svelte`, replace the hard-coded stat string `$12,450 ▲3.4%` in the `header` snippets with a real Stat component. Import Stat at the top:
```ts
import Stat from '$lib/widgets/display/Stat.svelte';
```

Replace:
```svelte
<span class="text-xs font-mono tabular-nums text-muted-foreground">$12,450 ▲3.4%</span>
```
with:
```svelte
<Stat value={12450.32} format="currency" deltaPercent={3.4} direction="up-good" size="sm" align="right" />
```

**Step 2 — create standalone Stat showcase at `src/routes/showcase/stat/+page.svelte`:**

Match the page-layout pattern of the existing showcase pages. Cover:
- Sizes: `sm`, `md`, `lg` with the same value so scale is obvious.
- Formats: `number`, `currency` (USD + INR for locale demo), `percent`, `compact` (e.g., 1_234_567).
- Direction matrix: 3x3 grid of (up/down/flat delta) x (up-good / down-good / auto).
- With and without label.
- Right-align vs left-align (two side-by-side).
- Dropped into a Card as header slot (a full "Monthly revenue" example).

Keep the page to ~150 lines. Match the page-layout pattern of `src/routes/showcase/card/+page.svelte`.

**Step 3 — typecheck + dev smoke:**
```
bun run check
bun run dev
```
Kill dev server after confirming it compiles without errors for `/showcase/stat`.

**Step 4 — commit:**
```
git add src/routes/showcase/card/+page.svelte src/routes/showcase/stat/
git commit -m "docs(ripple): Stat showcase + wire real Stat into Card showcase

Standalone /showcase/stat covers sizes, formats, direction matrix,
labeled/unlabeled, alignment, and Card-header composition.
Card showcase updated to use the real <Stat> widget instead of a
hard-coded stat string."
```

---

## Verification checklist

- [ ] `bun run test -- --run src/lib/widgets/display/Stat.test.ts` → 18 passed
- [ ] `bun run test -- --run` → full suite green, no regressions
- [ ] `bun run check` → no new errors attributable to Stat
- [ ] `/showcase/stat` renders all matrix cells
- [ ] `/showcase/card` header/composition examples use real Stat

## Follow-ups (NOT in this plan)

- Migrate `Metric` call-sites → `Stat`, then delete `Metric.svelte`.
- Inline-SVG sparkline support (`trendline: number[]`).
- JSON-spec `NodeRenderer` support for `<stat>` widget type and `slot="header"` lowering so LLM-authored JSON can drop Stat into Card's header.
- `styles.css` oklch + brand hue rewrite (will retune the emerald/red used here to match tokens).
