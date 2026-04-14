# Basic Widgets — Visual Quality Pass

**Date:** 2026-04-14
**Status:** Design — approved scope, aesthetic TBD
**Scope:** `src/lib/widgets/{layout,display,input,data,control,composite}/`
**Out of scope:** `workflow/`, `c4/`, `research/` (flow/graph UIs — revisit later)

## Problem

Basic widgets look generic / AI-generated. Root cause is shadcn-svelte defaults leaking through every widget: neutral HSL palette, stock radius, stock borders, stock focus rings, no distinctive motion or density.

## Approach (chosen: B)

Token refresh + per-widget polish pass. No new widgets, no public API changes.

- One `styles.css` rewrite (oklch tokens, distinctive brand hue, tighter radius/spacing/focus-ring scale, real dark mode).
- Widget-by-widget pass to fix what tokens alone can't: density, state coverage (hover/active/focus/selected/disabled/loading/empty/skeleton), header rhythm, trend/badge sizing, error/helper slots, mono/tabular usage on numerics.

Rejected:
- **A** (tokens only) — Cards and Metrics still feel generic.
- **C** (full bespoke system) — weeks of work, high risk of breaking paw-enterprise consumers.

## Stack decisions

| Library | Role | Notes |
|---|---|---|
| **bits-ui** | Headless behavior + a11y primitives | Drop shadcn-svelte's `src/lib/components/ui/` copy layer. Ripple owns visuals directly. |
| **runed** | Reactive utilities | `useDebounce`, `useResizeObserver`, `PersistedState`, `useIntersectionObserver`, focus trap. |
| **motion-svelte** | Enter/exit + layout animations | Scope to overlays (Dialog/Sheet/Popover/Toast) and disclosure (Tabs/Accordion). Do NOT sprinkle motion on every widget. |
| **tailwind-variants** | Single source of truth for per-widget variant recipes | Replaces ad-hoc `cn()` ternaries in widgets. |
| **@lucide/svelte** | Icons | Already in. |
| **layerchart / echarts** | Data widgets | Already in, keep. |

**Why plain bits-ui over shadcn-svelte:** shadcn's default Tailwind class sets ARE the "AI-generated" look; keeping them means fighting their CSS on every widget. shadcn-svelte is a thin styled copy over bits-ui — we already depend on bits-ui directly. Deleting the copy layer is a net simplification.

## Widgets in scope

- **layout/** Container, Flex, Grid, Card, GlassCard, Tabs, Dashboard, DashboardSlot
- **display/** Text, Heading, Image, Badge, Progress, Avatar, Metric, Feed, SoulStatus
- **input/** Button, Input, Select, Checkbox, Switch
- **data/** Table, Chart
- **control/** If, Each (no visuals — skip)
- **composite/** Terminal

## Known visual debts (from initial scan)

- `styles.css` uses HSL; CLAUDE.md claims oklch. Stale.
- `Button` has no loading state.
- `Input` has no error/helper text slot, no error state.
- `Card` has flex:1 baked in via `.rcard` global — leaks layout assumptions.
- `Metric` trend badges use magic `text-[10px] px-1.5 py-0` — not a token.
- No widget has a skeleton/empty state.
- No elevation or state-layer system (hover/selected differ ad-hoc per widget).

## Open questions (blocking implementation)

1. **Aesthetic target.** Pick one: (1) Linear/Vercel — dense, neutral, mono-heavy, sharp; (2) Notion/Arc — warmer, softer radii, generous whitespace; (3) Terminal/dev-tool — mono everywhere, high contrast, green/amber accent; (4) Custom / reference screenshots.
2. **Brand hue.** One primary accent oklch value, or keep neutral-only and rely on chart palette for color?
3. **Density default.** Comfortable or compact? (Affects padding scale across Card, Tabs, Table, Feed.)

## Card + Stat design (first widget pair)

Card stays a layout primitive. The "smart price/number change" UI lives in a separate `Stat` widget that composes into Card's header slot or body. This preserves hierarchy (primitives compose upward) and keeps Card reusable for non-stat content.

### `Card` API

```ts
interface CardProps {
  title?: string;
  description?: string;
  header?: Snippet;        // right side of header (actions, Stat, menu)
  footer?: Snippet;
  children?: Snippet;      // body
  variant?: 'default' | 'muted' | 'outlined' | 'elevated' | 'selected';
  density?: 'comfortable' | 'compact';
  interactive?: boolean;   // hover/press affordance + a11y when onclick set
  onclick?: () => void;
}
```

Fixes vs today's Card:
- Drops the `.rcard` global `flex:1` (leaks layout into consumers).
- Adds `header` / `footer` snippet slots.
- Adds `density` (comfortable / compact).
- Adds `outlined` / `elevated` variants.
- Adds proper interactive a11y (role=button, Enter/Space) when `onclick` is provided.

### `Stat` API (replaces `Metric`)

```ts
interface StatProps {
  label?: string;
  value: number | string;
  format?: 'number' | 'currency' | 'percent' | 'compact';
  currency?: string;              // 'USD'
  locale?: string;                // 'en-US'
  precision?: number;
  delta?: number;                 // absolute change
  deltaPercent?: number;          // percent change
  deltaFormat?: 'absolute' | 'percent' | 'both';
  direction?: 'auto' | 'up-good' | 'down-good' | 'neutral';
  trendline?: number[];           // optional sparkline (inline SVG)
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
}
```

Renders: muted label → large tabular-nums value → delta chip with ▲ / ▼ / — icon, colored per `direction`. Optional inline-SVG sparkline when `trendline` is supplied.

`direction` semantics:
- `auto` — positive delta green, negative red.
- `up-good` — up always good (revenue, signups).
- `down-good` — down good (latency, churn, cost).
- `neutral` — no color, just an arrow.

### Composition

```svelte
<Card title="Monthly revenue" description="Last 30 days">
  {#snippet header()}
    <Stat value={12450.32} format="currency" deltaPercent={3.4} direction="up-good" size="sm" />
  {/snippet}
  <Chart ... />
</Card>

<Card>
  <Stat label="Revenue" value={12450.32} format="currency"
        deltaPercent={3.4} direction="up-good" trendline={spark} size="lg" />
</Card>
```

### Decisions

- **Replace `Metric` with `Stat`.** Single widget, strictly better. `Metric` deprecated after migration. ✅ approved.
- **Sparkline rendering:** inline SVG (zero deps, ~30 lines). Keep `layerchart` for real charts. *(Proposed — confirm if different.)*
- **JSON-spec side for header/footer slots:** nested nodes with `slot="header"` lowered to Svelte snippets at the NodeRenderer layer. *(Proposed — confirm.)*

### Card visual treatment — locked: A (Hairline) — implemented 2026-04-14

- **Radius:** `8px` (token: `--radius-card`)
- **Border:** `1px` solid `--border` (hairline neutral)
- **Shadow:** none in default/outlined; `selected` adds inset 1px `--primary` ring
- **Background:** `--card` (same as page in light, subtly lifted in dark)
- **Padding:** `16px` compact (default), `20px` comfortable
- **Header rhythm:** title `14px/600`, description `13px/400 --muted-foreground`, 2px gap
- **Hover (when `interactive`):** border `--border` → `--border-hover` (one step darker), 120ms ease
- **Focus-visible:** 2px outline in `--ring`, 2px offset (outside the border)
- **Dark mode:** same treatment, neutral-800 border, card bg one step lighter than page

### Card variants (A-treatment)

| Variant | Purpose | Treatment |
|---|---|---|
| `default` | 95% of cards | Hairline border, card bg |
| `muted` | De-emphasized content | Hairline border, `--muted` bg |
| `outlined` | Grouped/nested emphasis | 1px border but `--foreground` at 15% (stronger) |
| `selected` | Active/picked in a list | Default + inset 1px `--primary` ring |

Dropped `elevated` — treatment A is flat by definition; use `outlined` or structural placement for emphasis instead.

### Card density default

**Compact** (16px padding). Paw OS dashboards are information-dense; comfortable adds whitespace that isn't earned. Consumers can opt into `density="comfortable"` per card.

Implementation: `src/lib/widgets/layout/Card.svelte`. Tests: `src/lib/widgets/layout/Card.test.ts` (8/8 passing). Showcase: `/showcase/card`. Plan: `docs/plans/2026-04-14-card-widget-rebuild.md`.

### Still blocked on

- Aesthetic target (Linear/Vercel vs Notion/Arc vs Terminal vs Custom) — drives radius, border weight, typography scale, shadow depth.
- Brand hue.
- Density default.

## Next step

Answer aesthetic + sparkline/slot questions → update this doc → run `writing-plans` to produce the per-widget implementation plan.
