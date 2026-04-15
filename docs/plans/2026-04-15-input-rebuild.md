# Input Rebuild — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild `src/lib/widgets/input/Input.svelte` — drop the shadcn wrapper, add error/helper text, label-inline variant, prefix/suffix icons, three sizes, and state data-attrs. Stays a controlled-ish text input (parent manages value, widget emits `oninput`/`onchange`).

**Architecture:** Native `<input>` element wrapped in a flex shell for prefix/suffix icons. `tailwind-variants` drives the shell + input field classes. Label is optional and always `<label for={id}>` when present. Helper text / error message render below the input; error state overrides helper. Size `md` is default and matches Button `md` (36px / h-9).

**Tech stack:** Svelte 5, Tailwind 4, `tailwind-variants`, `@lucide/svelte`, `@testing-library/svelte`, vitest.

**Design reference:** `docs/plans/2026-04-15-atoms-roadmap.md`.

**Out of scope:** Multi-line textarea (separate widget exists in shadcn folder), number-with-steppers, combobox, auto-complete, masked input.

---

## Task 1: Failing Input tests

**Files:**
- Create: `src/lib/widgets/input/Input.test.ts`

```ts
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Input from '$lib/widgets/input/Input.svelte';

test('renders with a placeholder', () => {
  render(Input, { props: { placeholder: 'Search' } });
  expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
});

test('renders label and associates it with the input via for=id', () => {
  render(Input, { props: { id: 'name', label: 'Full name' } });
  const input = screen.getByLabelText('Full name');
  expect(input).toBeInTheDocument();
  expect(input).toHaveAttribute('id', 'name');
});

test('defaults to size=md and state=idle', () => {
  const { container } = render(Input, { props: {} });
  expect(container.querySelector('[data-size="md"]')).not.toBeNull();
  expect(container.querySelector('[data-state="idle"]')).not.toBeNull();
});

test('size data-attribute applied', () => {
  const { container } = render(Input, { props: { size: 'lg' } });
  expect(container.querySelector('[data-size="lg"]')).not.toBeNull();
});

test('type is forwarded to the input element', () => {
  render(Input, { props: { type: 'email', placeholder: 'you@' } });
  expect(screen.getByPlaceholderText('you@')).toHaveAttribute('type', 'email');
});

test('defaults type to text', () => {
  render(Input, { props: { placeholder: 'x' } });
  expect(screen.getByPlaceholderText('x')).toHaveAttribute('type', 'text');
});

test('oninput fires with the current value on typing', async () => {
  const oninput = vi.fn();
  render(Input, { props: { placeholder: 'x', oninput } });
  await userEvent.type(screen.getByPlaceholderText('x'), 'hi');
  expect(oninput).toHaveBeenCalled();
  const lastCall = oninput.mock.calls[oninput.mock.calls.length - 1];
  expect(lastCall[0]).toBe('hi');
});

test('onchange fires on blur with the current value', async () => {
  const onchange = vi.fn();
  render(Input, { props: { placeholder: 'x', onchange } });
  const input = screen.getByPlaceholderText('x');
  await userEvent.type(input, 'bye');
  await userEvent.tab();
  expect(onchange).toHaveBeenCalled();
  const lastCall = onchange.mock.calls[onchange.mock.calls.length - 1];
  expect(lastCall[0]).toBe('bye');
});

test('error state sets data-state=error and aria-invalid', () => {
  const { container } = render(Input, {
    props: { placeholder: 'x', error: 'Required field' },
  });
  expect(container.querySelector('[data-state="error"]')).not.toBeNull();
  expect(screen.getByPlaceholderText('x')).toHaveAttribute('aria-invalid', 'true');
});

test('error message is rendered and linked via aria-describedby', () => {
  const { container } = render(Input, {
    props: { id: 'email', placeholder: 'x', error: 'Invalid email' },
  });
  const msg = container.querySelector('[data-slot="input-error"]');
  expect(msg).not.toBeNull();
  expect(msg!.textContent).toContain('Invalid email');
  const input = screen.getByPlaceholderText('x');
  const describedBy = input.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  expect(describedBy).toBe(msg!.id);
});

test('helper text renders when no error', () => {
  const { container } = render(Input, {
    props: { placeholder: 'x', helper: 'Use your work email' },
  });
  const msg = container.querySelector('[data-slot="input-helper"]');
  expect(msg).not.toBeNull();
  expect(msg!.textContent).toContain('Use your work email');
});

test('error overrides helper when both provided', () => {
  const { container } = render(Input, {
    props: { placeholder: 'x', helper: 'help', error: 'err' },
  });
  expect(container.querySelector('[data-slot="input-error"]')?.textContent).toContain('err');
  expect(container.querySelector('[data-slot="input-helper"]')).toBeNull();
});

test('disabled state reflected in attributes', () => {
  const { container } = render(Input, { props: { placeholder: 'x', disabled: true } });
  expect(screen.getByPlaceholderText('x')).toBeDisabled();
  expect(container.querySelector('[data-state="disabled"]')).not.toBeNull();
});

test('required is forwarded to the input', () => {
  render(Input, { props: { placeholder: 'x', required: true } });
  expect(screen.getByPlaceholderText('x')).toBeRequired();
});

test('readOnly is forwarded to the input', () => {
  render(Input, { props: { placeholder: 'x', readOnly: true } });
  expect(screen.getByPlaceholderText('x')).toHaveAttribute('readonly');
});

test('prefix slot renders inside the shell', () => {
  const { container } = render(Input, { props: { placeholder: 'x', 'data-test': 'wrap' } as any });
  // With no prefix Snippet, the slot wrapper should not render.
  expect(container.querySelector('[data-slot="input-prefix"]')).toBeNull();
});
```

Run → confirm failures (current Input has no error/helper/size/state/prefix/data-attrs; `onchange(value)` fires on change but the shape differs). Commit message:

```
test(ripple): Input behavior spec (failing)

Defines contract: labeled input with for=id, type forwarding,
oninput+onchange value payload, error/helper text with aria-invalid
+ aria-describedby, disabled/required/readOnly forwarding, and
data-size/data-state hooks.
```

---

## Task 2: Rebuild Input.svelte

**Files:**
- Modify: `src/lib/widgets/input/Input.svelte` (full rewrite)

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { tv } from 'tailwind-variants';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    value?: string | number;
    placeholder?: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    name?: string;
    autocomplete?: string;
    error?: string;
    helper?: string;
    prefix?: Snippet;
    suffix?: Snippet;
    oninput?: (value: string) => void;
    onchange?: (value: string) => void;
    onfocus?: (e: FocusEvent) => void;
    onblur?: (e: FocusEvent) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    value = '',
    placeholder = '',
    type = 'text',
    size = 'md',
    disabled = false,
    readOnly = false,
    required = false,
    name,
    autocomplete,
    error,
    helper,
    prefix,
    suffix,
    oninput,
    onchange,
    onfocus,
    onblur,
  }: Props = $props();

  // Generate a stable id for label association and aria-describedby.
  const autoId = $props.id ? $props.id() : crypto.randomUUID().slice(0, 8);
  const resolvedId = $derived(id ?? `ripple-input-${autoId}`);
  const helperId = $derived(`${resolvedId}-msg`);

  const state = $derived(
    error ? 'error' : disabled ? 'disabled' : readOnly ? 'readonly' : 'idle'
  );

  const shell = tv({
    base: 'flex items-center gap-2 rounded-[8px] border bg-background text-foreground transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
    variants: {
      size: {
        sm: 'h-8 px-2.5 text-[13px]',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-3.5 text-[15px]',
      },
      state: {
        idle: 'border-border',
        disabled: 'border-border opacity-50 pointer-events-none',
        readonly: 'border-border bg-muted/40',
        error: 'border-destructive',
      },
    },
    defaultVariants: { size: 'md', state: 'idle' },
  });

  const field = tv({
    base: 'flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed',
  });

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function handleInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    oninput?.(v);
  }

  function handleChange(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    onchange?.(v);
  }
</script>

<div
  class={cn('flex flex-col gap-1.5', className)}
  style={styleString}
  data-size={size}
  data-state={state}
>
  {#if label}
    <label
      for={resolvedId}
      class="text-[13px] font-medium leading-none text-foreground"
    >
      {label}
      {#if required}<span class="text-destructive" aria-hidden="true">*</span>{/if}
    </label>
  {/if}

  <div class={shell({ size, state })}>
    {#if prefix}
      <span data-slot="input-prefix" class="inline-flex shrink-0 text-muted-foreground">
        {@render prefix()}
      </span>
    {/if}
    <input
      id={resolvedId}
      {type}
      {name}
      {placeholder}
      {disabled}
      readonly={readOnly}
      {required}
      {autocomplete}
      value={value ?? ''}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={(error || helper) ? helperId : undefined}
      class={field()}
      oninput={handleInput}
      onchange={handleChange}
      {onfocus}
      {onblur}
    />
    {#if suffix}
      <span data-slot="input-suffix" class="inline-flex shrink-0 text-muted-foreground">
        {@render suffix()}
      </span>
    {/if}
  </div>

  {#if error}
    <span id={helperId} data-slot="input-error" class="text-[12px] text-destructive">
      {error}
    </span>
  {:else if helper}
    <span id={helperId} data-slot="input-helper" class="text-[12px] text-muted-foreground">
      {helper}
    </span>
  {/if}
</div>
```

Notes for the implementer:
- Svelte 5's `crypto.randomUUID` isn't deterministic across SSR/CSR renders — that's acceptable here because Ripple runs in the browser. If SSR hydration becomes a concern later, swap to `$props.id()`. Do not optimize prematurely; if `$props.id` exists in Svelte 5.51+, prefer it.
- Use `$props.id()` if available — simpler. The snippet above falls back to crypto, but if you find `$props.id()` exists (check Svelte docs / types), use that exclusively. Update the code accordingly. Either way, the test just needs `id` association to work.

Run tests: `bun run test -- --run src/lib/widgets/input/Input.test.ts` → 16 pass. Full suite: 124 + 16 = 140 expected. Typecheck. Commit:

```
feat(ripple): rebuild Input — drop shadcn wrapper, add error/helper/prefix/suffix

- Drops $lib/components/ui/input wrapper layer
- tailwind-variants recipe drives shell + field states
- Sizes: sm/md/lg (default md) aligned to Button heights
- New: error prop + aria-invalid + aria-describedby + data-state=error
- New: helper prop (shown when no error)
- New: prefix/suffix snippet slots for icons
- New: required indicator (*), readOnly, autocomplete forwarding
- Emits oninput(value) on typing, onchange(value) on blur

Ref: docs/plans/2026-04-15-input-rebuild.md
```

---

## Task 3: Input showcase

**Files:**
- Create: `src/routes/showcase/input/+page.svelte`

Sections (same shape as Button showcase):
1. **Sizes** — sm/md/lg with a "Search..." placeholder.
2. **Labeled** — three Inputs, one labeled "Full name", one "Email" with `type="email"`, one "Password" with `type="password"`.
3. **With helper text** — labeled Input with `helper="Use your work email"`.
4. **Error state** — labeled Input with `error="Invalid email format"`.
5. **Prefix / suffix icons** — `Search` icon prefix; `Mail` suffix; combined `DollarSign` prefix + `.00` text suffix.
6. **Disabled / readOnly** — side-by-side.
7. **Inside a Card** (form composition) — Card with title="Create pocket", two Inputs (name, description), and a row of Cancel / Create Buttons.

Imports: `Input`, `Card`, `Button`, and lucide icons `Search`, `Mail`, `DollarSign`, `Lock`.

Commit: `docs(ripple): Input showcase — sizes, error/helper, icons, in-card form`

---

## Task 4: Roadmap status update

Flip Input ✅, Badge 🟡 next in `docs/plans/2026-04-15-atoms-roadmap.md`.

Commit: `docs(ripple): roadmap — Input done, Badge next`

---

## Verification checklist

- [ ] `bun run test -- --run src/lib/widgets/input/Input.test.ts` → 16 pass
- [ ] `bun run test -- --run` → full suite green (140+)
- [ ] `bun run check` → no new errors from Input
- [ ] `/showcase/input` renders all 7 sections; error message visible in red; prefix/suffix icons aligned; disabled is visually muted
- [ ] No `$lib/components/ui/input` import remains in `Input.svelte`

## Follow-ups

- Textarea (multi-line sibling widget).
- Clear button (x) in suffix when value non-empty.
- Character count (for max-length fields).
- Integration with form-level validation — out of scope until Form widget lands.
