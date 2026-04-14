# Card Widget Rebuild — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Ripple's current `Card` widget with a rebuilt version using treatment A (hairline), new API (header/footer snippets, density, interactive a11y, variants), and inline Tailwind-variants — dropping the shadcn-svelte `Card.*` wrapper layer and the leaky `.rcard` global style.

**Architecture:** The rebuilt `Card.svelte` composes a single semantic container (no `Card.Root / Card.Header / Card.Content` indirection). Visuals defined in a local `tailwind-variants` recipe — single source of truth for variant/density/state classes. Header uses a `snippet` slot for right-aligned content (Stat, actions, menu). When `onclick` is provided, the card becomes a focusable `role=button` with keyboard support. Tests added using `@testing-library/svelte` + `jsdom` (first tests in the repo; test scaffolding is part of this plan). Visual verification via the `/showcase` route.

**Tech Stack:** Svelte 5 runes, Tailwind CSS 4, `tailwind-variants`, `@testing-library/svelte`, `@testing-library/jest-dom`, `jsdom`, `vitest`.

**Design reference:** `docs/plans/2026-04-14-basic-widgets-visual-quality-design.md`

**Out of scope:** `Stat` widget (separate plan), shadcn `components/ui/card/*` deletion (keeps working for other widgets until Stat lands), token/styles.css rewrite (separate plan). NodeRenderer JSON-spec `slot=` lowering is noted as a follow-up; this plan accepts the widget-side API only.

---

## Task 1: Add Svelte component test scaffolding

**Files:**
- Modify: `package.json`
- Create: `src/test-setup.ts`
- Modify: `vitest.config.ts`

**Step 1: Install test dependencies**

Run:
```bash
cd D:/paw/ripple
bun add -d @testing-library/svelte @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected: `package.json` devDependencies gains the four packages. `bun.lock` updates.

**Step 2: Create test setup file**

Create `src/test-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

**Step 3: Wire setup into vitest**

Modify `vitest.config.ts` — replace the `test: { ... }` block with:
```ts
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
```

**Step 4: Sanity-check the scaffolding with a trivial test**

Create `src/lib/test-sanity.test.ts`:
```ts
import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Heading from '$lib/widgets/display/Heading.svelte';

test('testing scaffolding renders a Svelte component', () => {
  render(Heading, { props: { level: 1, text: 'hello' } });
  expect(screen.getByText('hello')).toBeInTheDocument();
});
```

Run:
```bash
bun run test -- --run src/lib/test-sanity.test.ts
```

Expected: PASS.

**Step 5: Delete the sanity test**

Remove `src/lib/test-sanity.test.ts` — it was only to prove the setup works.

**Step 6: Commit**

```bash
git add package.json bun.lock src/test-setup.ts vitest.config.ts
git commit -m "chore(ripple): add svelte component test scaffolding

Adds @testing-library/svelte + jsdom for widget tests.
First tests land with Card widget rebuild."
```

---

## Task 2: Write Card failing tests (behavior only)

**Files:**
- Create: `src/lib/widgets/layout/Card.test.ts`

Visual treatment (borders, radius, padding) is not unit-tested — it's verified in the showcase in Task 6. Tests cover: props-to-DOM mapping, slot rendering, a11y behavior when interactive.

**Step 1: Write failing tests**

Create `src/lib/widgets/layout/Card.test.ts`:
```ts
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Card from '$lib/widgets/layout/Card.svelte';

test('renders title and description', () => {
  render(Card, { props: { title: 'Revenue', description: 'Last 30 days' } });
  expect(screen.getByText('Revenue')).toBeInTheDocument();
  expect(screen.getByText('Last 30 days')).toBeInTheDocument();
});

test('omits header block when no title or description', () => {
  const { container } = render(Card, { props: {} });
  expect(container.querySelector('[data-slot="card-header"]')).toBeNull();
});

test('applies variant class', () => {
  const { container } = render(Card, { props: { variant: 'muted' } });
  expect(container.querySelector('[data-variant="muted"]')).not.toBeNull();
});

test('applies density class', () => {
  const { container } = render(Card, { props: { density: 'comfortable' } });
  expect(container.querySelector('[data-density="comfortable"]')).not.toBeNull();
});

test('defaults to compact density', () => {
  const { container } = render(Card, { props: {} });
  expect(container.querySelector('[data-density="compact"]')).not.toBeNull();
});

test('interactive card is role=button and keyboard-activatable', async () => {
  const onclick = vi.fn();
  render(Card, { props: { title: 'Pick me', interactive: true, onclick } });
  const card = screen.getByRole('button', { name: /pick me/i });
  expect(card).toHaveAttribute('tabindex', '0');

  await userEvent.click(card);
  expect(onclick).toHaveBeenCalledTimes(1);

  card.focus();
  await userEvent.keyboard('{Enter}');
  expect(onclick).toHaveBeenCalledTimes(2);

  await userEvent.keyboard(' ');
  expect(onclick).toHaveBeenCalledTimes(3);
});

test('non-interactive card has no button role even with onclick', () => {
  render(Card, { props: { title: 'no-op', onclick: () => {} } });
  expect(screen.queryByRole('button')).toBeNull();
});

test('selected variant sets aria-pressed when interactive', () => {
  render(Card, {
    props: { title: 'picked', interactive: true, variant: 'selected', onclick: () => {} },
  });
  expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
});
```

**Step 2: Run tests to confirm they fail**

Run: `bun run test -- --run src/lib/widgets/layout/Card.test.ts`

Expected: multiple FAIL — current Card has no `data-variant` / `data-density` / interactive a11y / selected `aria-pressed`.

**Step 3: Commit the failing tests**

```bash
git add src/lib/widgets/layout/Card.test.ts
git commit -m "test(ripple): Card behavior spec (failing)

Defines contract for rebuilt Card widget: props-to-DOM,
slot rendering, interactive a11y, selected aria-pressed."
```

---

## Task 3: Rebuild Card.svelte

**Files:**
- Modify: `src/lib/widgets/layout/Card.svelte` (full rewrite)

**Step 1: Rewrite Card.svelte**

Replace the entire file with:
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { tv } from 'tailwind-variants';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    description?: string;
    header?: Snippet;
    footer?: Snippet;
    children?: Snippet;
    hasChildren?: boolean;
    variant?: 'default' | 'muted' | 'outlined' | 'selected';
    density?: 'comfortable' | 'compact';
    interactive?: boolean;
    onclick?: (e?: unknown) => void;
  }

  let {
    id,
    class: className,
    style,
    title,
    description,
    header,
    footer,
    children,
    hasChildren = false,
    variant = 'default',
    density = 'compact',
    interactive = false,
    onclick,
  }: Props = $props();

  const card = tv({
    base: 'relative flex flex-col rounded-[8px] bg-card text-card-foreground transition-colors',
    variants: {
      variant: {
        default: 'border border-border',
        muted: 'border border-border bg-muted',
        outlined: 'border border-foreground/15',
        selected: 'border border-border ring-1 ring-inset ring-primary',
      },
      density: {
        compact: 'gap-2 p-4',
        comfortable: 'gap-3 p-5',
      },
      interactive: {
        true: 'cursor-pointer hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      density: 'compact',
      interactive: false,
    },
  });

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined,
  );

  const isInteractive = $derived(interactive && typeof onclick === 'function');
  const showHeader = $derived(Boolean(title || description || header));

  function onKeydown(e: KeyboardEvent) {
    if (!isInteractive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onclick?.(e);
    }
  }
</script>

<svelte:element
  this={isInteractive ? 'button' : 'div'}
  type={isInteractive ? 'button' : undefined}
  {id}
  class={cn(card({ variant, density, interactive: isInteractive }), className)}
  style={styleString}
  data-variant={variant}
  data-density={density}
  role={isInteractive ? 'button' : undefined}
  tabindex={isInteractive ? 0 : undefined}
  aria-pressed={isInteractive && variant === 'selected' ? 'true' : undefined}
  onclick={isInteractive ? onclick : undefined}
  onkeydown={isInteractive ? onkeydown : undefined}
>
  {#if showHeader}
    <div data-slot="card-header" class="flex items-start justify-between gap-4">
      {#if title || description}
        <div class="flex flex-col gap-[2px] min-w-0">
          {#if title}
            <div class="text-[14px] font-semibold leading-tight truncate">{title}</div>
          {/if}
          {#if description}
            <div class="text-[13px] font-normal text-muted-foreground leading-snug">
              {description}
            </div>
          {/if}
        </div>
      {/if}
      {#if header}
        <div class="shrink-0">{@render header()}</div>
      {/if}
    </div>
  {/if}

  {#if hasChildren || children}
    <div data-slot="card-body" class="min-w-0">
      {@render children?.()}
    </div>
  {/if}

  {#if footer}
    <div data-slot="card-footer" class="mt-auto pt-2 border-t border-border/60">
      {@render footer()}
    </div>
  {/if}
</svelte:element>
```

**Step 2: Run the Card tests**

Run: `bun run test -- --run src/lib/widgets/layout/Card.test.ts`

Expected: all PASS.

**Step 3: Typecheck**

Run: `bun run check`

Expected: no errors introduced by Card.svelte. (Pre-existing errors elsewhere are fine; the diff should not add any.)

**Step 4: Commit**

```bash
git add src/lib/widgets/layout/Card.svelte
git commit -m "feat(ripple): rebuild Card with treatment A + header/footer slots

- Drops shadcn Card.Root/Header/Content wrapper layer
- Drops .rcard flex:1 global (was leaking layout)
- Adds header/footer snippet slots
- Adds density + interactive props with a11y (role=button, Enter/Space, aria-pressed)
- Variants: default, muted, outlined, selected (dropped elevated)
- tailwind-variants recipe as single source of truth

Ref: docs/plans/2026-04-14-basic-widgets-visual-quality-design.md"
```

---

## Task 4: Handle the removed `.rcard` global

**Files:**
- Search: repo-wide for `.rcard`

**Step 1: Check if anything depends on `.rcard`**

Run:
```bash
grep -rn "rcard" D:/paw/ripple/src D:/paw/paw-enterprise/src 2>&1 | grep -v node_modules
```

Expected: no consumer hits (was a leaky internal class). If there are hits outside `Card.svelte`, each one needs a local `flex-1 min-w-0 overflow-hidden` replacement.

**Step 2: If hits exist, apply local replacement**

For each external hit, replace `rcard` class with `flex-1 min-w-0 overflow-hidden` on the element that actually needs flexing. Commit per consumer with message `fix(ripple): inline rcard replacement for <file>`.

**Step 3: If no hits, skip — already committed in Task 3**

---

## Task 5: Update the widget registry comment and type exports

**Files:**
- Modify: `src/lib/widgets/layout/index.ts`
- Modify: `src/lib/widgets/index.ts` (if Card types are re-exported here — check first)

**Step 1: Read current exports**

Read `src/lib/widgets/layout/index.ts`. Confirm Card is already exported.

**Step 2: Export the Card Props type**

If `layout/index.ts` does not already export the type, add:
```ts
export { default as Card } from './Card.svelte';
export type { Props as CardProps } from './Card.svelte';
```

If the widget schema (`src/lib/schema/ui-spec.ts`) defines Card prop shapes, update any dropped/added props:
- REMOVE: `variant: 'default' | 'selected' | 'muted'` (old 3-variant set)
- ADD: `variant: 'default' | 'muted' | 'outlined' | 'selected'`
- ADD: `density: 'comfortable' | 'compact'`
- ADD: `interactive: boolean`

**Step 3: Typecheck**

Run: `bun run check`

Expected: clean.

**Step 4: Commit**

```bash
git add src/lib/widgets/layout/index.ts src/lib/schema/ui-spec.ts
git commit -m "feat(ripple): expose Card props via schema and index"
```

---

## Task 6: Add a Card section to the showcase for visual verification

**Files:**
- Modify: `src/routes/showcase/+page.svelte` (or create `src/routes/showcase/card/+page.svelte` if the existing showcase is crowded — check first)

**Step 1: Read the existing showcase**

Read `src/routes/showcase/+page.svelte`. Decide: append a "Cards" section, or create `src/routes/showcase/card/+page.svelte`. Prefer appending unless the file is already >400 lines.

**Step 2: Add Card examples**

Add a section with these examples (adapt to the showcase's existing section pattern):
```svelte
<section class="space-y-4">
  <h2 class="text-lg font-semibold">Card</h2>

  <div class="grid grid-cols-3 gap-3">
    <Card title="Default" description="Hairline border, 8px radius">
      Body content goes here.
    </Card>

    <Card title="Muted" description="Backgrounded variant" variant="muted">
      Body content.
    </Card>

    <Card title="Outlined" description="Stronger border for emphasis" variant="outlined">
      Body content.
    </Card>

    <Card title="Selected" description="Active in a picker" variant="selected">
      Body content.
    </Card>

    <Card title="Compact" description="16px padding (default)">
      Body content.
    </Card>

    <Card title="Comfortable" description="20px padding" density="comfortable">
      Body content.
    </Card>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <Card
      title="Interactive"
      description="Clickable + keyboard focusable"
      interactive
      onclick={() => console.log('clicked')}
    >
      Click me or tab + Enter.
    </Card>

    <Card title="Monthly revenue" description="Last 30 days">
      {#snippet header()}
        <span class="text-xs font-mono tabular-nums text-muted-foreground">$12,450 ▲3.4%</span>
      {/snippet}
      <div class="h-16 rounded bg-muted/50" aria-hidden="true"></div>
      {#snippet footer()}
        <span class="text-xs text-muted-foreground">Updated 2m ago</span>
      {/snippet}
    </Card>
  </div>
</section>
```

Import at the top:
```ts
import Card from '$lib/widgets/layout/Card.svelte';
```

**Step 3: Run the dev server and visually verify**

Run: `bun run dev`

Open: `http://localhost:5173/showcase` (or whichever port vite picks — watch the log).

Verify against treatment A spec:
- Hairline 1px border, 8px radius, no shadow.
- Compact is tighter than comfortable.
- Hover on Interactive card darkens the border.
- Tab-focus on Interactive card shows the ring (2px offset).
- Enter/Space on the focused Interactive card logs "clicked".
- Selected card shows an inset primary ring.
- Muted card has `--muted` background.
- The "Monthly revenue" card shows title+description on the left and the stat text on the right, with a footer.

Stop the dev server (Ctrl+C) once verified.

**Step 4: Commit**

```bash
git add src/routes/showcase/
git commit -m "docs(ripple): showcase for rebuilt Card (all variants + slots)"
```

---

## Task 7: Mark the design doc as implemented

**Files:**
- Modify: `docs/plans/2026-04-14-basic-widgets-visual-quality-design.md`

**Step 1: Update status header**

Change the Card section header from `locked: A (Hairline)` to `locked: A (Hairline) — implemented 2026-04-14`.

Add a line at the bottom of the Card section:
```
Implementation: `src/lib/widgets/layout/Card.svelte`. Plan: `docs/plans/2026-04-14-card-widget-rebuild.md`.
```

**Step 2: Commit**

```bash
git add docs/plans/2026-04-14-basic-widgets-visual-quality-design.md
git commit -m "docs(ripple): mark Card design as implemented"
```

---

## Verification checklist (before calling this plan done)

- [ ] `bun run test -- --run src/lib/widgets/layout/Card.test.ts` → all pass
- [ ] `bun run check` → no new errors attributable to Card
- [ ] `bun run dev` → showcase page renders all 8 Card examples correctly
- [ ] `grep -rn "rcard" src/` → no hits outside Card.svelte
- [ ] `grep -rn "Card.Root\|Card.Header\|Card.Content" src/lib/widgets/` → zero hits (no widget wraps the old shadcn Card primitive indirectly)
- [ ] All commits on the working branch, no unstaged changes

## Follow-ups (NOT in this plan)

- `Stat` widget (replaces `Metric`).
- `styles.css` rewrite to oklch tokens + brand hue.
- JSON-spec `slot=` → snippet lowering in `NodeRenderer.svelte` so LLM-authored specs can target Card's `header`/`footer` slots.
- Deletion of `src/lib/components/ui/card/` once no other widget depends on it.
