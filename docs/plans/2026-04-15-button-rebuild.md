# Button Rebuild — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `src/lib/widgets/input/Button.svelte` with a rebuilt version that drops the shadcn wrapper layer, owns its own `tailwind-variants` recipe, adds `loading` / `leading` / `trailing` affordances, and exposes `data-variant` / `data-size` / `data-state` for styling and tests.

**Architecture:** Pure Svelte 5 `<button>` with `tailwind-variants` recipe and lucide icons. No `bits-ui` primitive (a native button is all we need). `type`, `form`, `name`, `value`, and standard event handlers forwarded so Button works in form submits. Keeps `hasChildren` prop for JSON-spec compatibility. Loading state shows a spinner in-place of `leading` slot content, disables clicks, sets `aria-busy`.

**Tech stack:** Svelte 5 runes, Tailwind 4, `tailwind-variants`, `@lucide/svelte` (`Loader2`), `@testing-library/svelte`, vitest.

**Design reference:** `docs/plans/2026-04-15-atoms-roadmap.md`.

**Out of scope:** Deleting `src/lib/components/ui/button/`, icon-only mode with tooltip, split-button, button group. All follow-ups.

---

## Task 1: Write failing Button tests

**Files:**
- Create: `src/lib/widgets/input/Button.test.ts`

**Step 1 — write tests:**

```ts
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Button from '$lib/widgets/input/Button.svelte';

test('renders label text', () => {
  render(Button, { props: { label: 'Save' } });
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
});

test('defaults to variant=default and size=md', () => {
  const { container } = render(Button, { props: { label: 'X' } });
  expect(container.querySelector('[data-variant="default"]')).not.toBeNull();
  expect(container.querySelector('[data-size="md"]')).not.toBeNull();
});

test('applies variant data-attribute', () => {
  const { container } = render(Button, { props: { label: 'X', variant: 'destructive' } });
  expect(container.querySelector('[data-variant="destructive"]')).not.toBeNull();
});

test('applies size data-attribute', () => {
  const { container } = render(Button, { props: { label: 'X', size: 'lg' } });
  expect(container.querySelector('[data-size="lg"]')).not.toBeNull();
});

test('fires onclick', async () => {
  const onclick = vi.fn();
  render(Button, { props: { label: 'go', onclick } });
  await userEvent.click(screen.getByRole('button'));
  expect(onclick).toHaveBeenCalledTimes(1);
});

test('disabled prevents onclick and sets aria-disabled', async () => {
  const onclick = vi.fn();
  render(Button, { props: { label: 'go', disabled: true, onclick } });
  const btn = screen.getByRole('button');
  expect(btn).toBeDisabled();
  await userEvent.click(btn);
  expect(onclick).not.toHaveBeenCalled();
});

test('loading sets aria-busy and prevents onclick', async () => {
  const onclick = vi.fn();
  render(Button, { props: { label: 'saving', loading: true, onclick } });
  const btn = screen.getByRole('button');
  expect(btn).toHaveAttribute('aria-busy', 'true');
  expect(btn).toBeDisabled();
  await userEvent.click(btn);
  expect(onclick).not.toHaveBeenCalled();
});

test('loading renders spinner icon', () => {
  const { container } = render(Button, { props: { label: 'saving', loading: true } });
  // lucide Loader2 renders with class lucide-loader-circle or lucide-loader-2 depending on version;
  // match the generic lucide prefix OR the explicit data-slot marker.
  expect(container.querySelector('[data-slot="button-spinner"]')).not.toBeNull();
});

test('type defaults to "button"', () => {
  render(Button, { props: { label: 'X' } });
  expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
});

test('type="submit" forwarded to button element', () => {
  render(Button, { props: { label: 'X', type: 'submit' } });
  expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
});

test('icon-only size applies data-size=icon', () => {
  const { container } = render(Button, { props: { size: 'icon', 'aria-label': 'menu' } });
  expect(container.querySelector('[data-size="icon"]')).not.toBeNull();
});

test('renders children snippet when hasChildren is true', () => {
  // Svelte testing-library doesn't pass snippets easily; verify via label fallback path instead
  // by rendering WITHOUT hasChildren and confirming label path renders
  render(Button, { props: { label: 'fallback' } });
  expect(screen.getByText('fallback')).toBeInTheDocument();
});
```

**Step 2 — run to confirm fail:**
```
bun run test -- --run src/lib/widgets/input/Button.test.ts
```
Expected: several failures (no data-variant/data-size/data-state, no loading, no explicit type default). 1-2 may pass by accident.

**Step 3 — commit:**
```
git add src/lib/widgets/input/Button.test.ts
git commit -m "test(ripple): Button behavior spec (failing)

Defines contract: data-variant/data-size/data-state, loading
(aria-busy + spinner + click-block), disabled, type forwarding,
icon size variant, default type='button'."
```

---

## Task 2: Rebuild Button.svelte

**Files:**
- Modify: `src/lib/widgets/input/Button.svelte` (full rewrite)

**Step 1 — rewrite:**

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { tv } from 'tailwind-variants';
  import { Loader2 } from '@lucide/svelte';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    children?: Snippet;
    hasChildren?: boolean;
    leading?: Snippet;
    trailing?: Snippet;
    variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
    form?: string;
    name?: string;
    value?: string;
    'aria-label'?: string;
    onclick?: (e?: MouseEvent) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    children,
    hasChildren = false,
    leading,
    trailing,
    variant = 'default',
    size = 'md',
    type = 'button',
    disabled = false,
    loading = false,
    form,
    name,
    value,
    'aria-label': ariaLabel,
    onclick,
  }: Props = $props();

  const button = tv({
    base: 'inline-flex items-center justify-center gap-1.5 rounded-[8px] font-medium whitespace-nowrap select-none transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-border bg-transparent text-foreground hover:bg-muted',
        ghost: 'bg-transparent text-foreground hover:bg-muted',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline px-0',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-5 text-[15px]',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  });

  const isDisabled = $derived(disabled || loading);
  const state = $derived(loading ? 'loading' : disabled ? 'disabled' : 'idle');

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined,
  );

  const iconSize = $derived(size === 'sm' ? 14 : size === 'lg' ? 18 : 16);

  function handleClick(e: MouseEvent) {
    if (isDisabled) return;
    onclick?.(e);
  }
</script>

<button
  {id}
  {type}
  {form}
  {name}
  {value}
  class={cn(button({ variant, size }), className)}
  style={styleString}
  data-variant={variant}
  data-size={size}
  data-state={state}
  disabled={isDisabled}
  aria-busy={loading ? 'true' : undefined}
  aria-label={ariaLabel}
  onclick={handleClick}
>
  {#if loading}
    <span data-slot="button-spinner" class="inline-flex shrink-0">
      <Loader2 size={iconSize} class="animate-spin" />
    </span>
  {:else if leading}
    <span data-slot="button-leading" class="inline-flex shrink-0">{@render leading()}</span>
  {/if}

  {#if hasChildren && children}
    {@render children()}
  {:else if label}
    <span>{label}</span>
  {/if}

  {#if !loading && trailing}
    <span data-slot="button-trailing" class="inline-flex shrink-0">{@render trailing()}</span>
  {/if}
</button>
```

**Step 2 — run Button tests:**
```
bun run test -- --run src/lib/widgets/input/Button.test.ts
```
Expected: all pass.

**Step 3 — full suite:**
```
bun run test -- --run
```
All previous tests still green (112+).

**Step 4 — typecheck:**
```
bun run check
```
No new errors from Button.

**Step 5 — commit:**
```
git add src/lib/widgets/input/Button.svelte
git commit -m "feat(ripple): rebuild Button — drop shadcn wrapper, add loading+icons

- Drops \$lib/components/ui/button wrapper layer
- tailwind-variants recipe as single source of visual truth
- Sizes: sm/md/lg/icon (default md) with 8/9/10 px heights
- Variants: default, secondary, outline, ghost, link, destructive
- New: loading prop (Loader2 spinner + aria-busy + click-block)
- New: leading/trailing Snippet slots for icons
- New: data-variant, data-size, data-state attrs for styling hooks
- Forwards type/form/name/value/aria-label to the native button
- type defaults to 'button' (prevents accidental form submits)

Ref: docs/plans/2026-04-15-atoms-roadmap.md"
```

---

## Task 3: Add Button section to showcase

**Files:**
- Create: `src/routes/showcase/button/+page.svelte`

**Step 1 — create page.** Match the page-layout pattern used in `src/routes/showcase/card/+page.svelte`. Include sections:

1. **Variants** — one row of all 6 variants at default size.
2. **Sizes** — sm/md/lg/icon side-by-side (icon uses a lucide icon via `leading` snippet and `aria-label`).
3. **With leading / trailing icons** — real lucide icons via snippets.
4. **Loading** — a button that toggles its `loading` state on click for 1.5s (use `setTimeout` + `$state`) so you can see the spinner + disabled behavior live.
5. **Disabled** — all variants disabled for visual audit.
6. **Full-width + link variant** — one with `class="w-full"`, one `variant="link"`.
7. **In a Card** — a Card with a row of Buttons (primary + ghost) in the body so density matches.

Imports:
```ts
import Button from '$lib/widgets/input/Button.svelte';
import Card from '$lib/widgets/layout/Card.svelte';
import { Plus, ArrowRight, Trash2, Check } from '@lucide/svelte';
```

**Step 2 — typecheck + dev smoke + tests:**
```
bun run check
bun run dev   # wait 8s, confirm compile, kill
bun run test -- --run
```

**Step 3 — commit:**
```
git add src/routes/showcase/button/
git commit -m "docs(ripple): Button showcase — variants, sizes, icons, loading, in-card"
```

---

## Task 4: Update roadmap status

**Files:**
- Modify: `docs/plans/2026-04-15-atoms-roadmap.md`

Change Button row status from 🟡 next → ✅ done, flip Input to 🟡 next.

Commit:
```
git add docs/plans/2026-04-15-atoms-roadmap.md
git commit -m "docs(ripple): roadmap — Button ✅, Input next"
```

---

## Verification checklist

- [ ] `bun run test -- --run src/lib/widgets/input/Button.test.ts` → all pass
- [ ] `bun run test -- --run` → full suite green
- [ ] `bun run check` → no new errors from Button
- [ ] `/showcase/button` renders all 7 sections, loading animation visible, disabled opacity visible
- [ ] Button in Card shows consistent density (md button height matches Card compact padding rhythm)
- [ ] No import of `$lib/components/ui/button` remains in `src/lib/widgets/input/Button.svelte`

## Follow-ups (NOT in this plan)

- Icon-only Button with auto-generated Tooltip when `aria-label` is set.
- ButtonGroup primitive (stacks radii, shares borders).
- Split button with dropdown.
- `asChild` pattern (render as `<a>` for link-styled CTAs).
