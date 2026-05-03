# Wave 1 Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 13 widgets that close out Wave 1 of the gap audit (`docs/superpowers/specs/2026-04-30-widgets-wave1-design.md`).

**Architecture:** Each widget is a thin Svelte 5 component in `src/lib/widgets/<category>/`, wraps a shadcn-svelte primitive when one exists, follows the established `id`/`class`/`style` prop convention, and is registered in `widgets/index.ts`. One new module — `core/toast-bus.svelte.ts` — backs the `<toast />` widget by chaining off the existing `EventDispatcher.onEvent` callback. One new shadcn-svelte primitive (`hover-card`) is installed.

**Tech Stack:** Svelte 5 (runes), shadcn-svelte, bits-ui v2, `@lucide/svelte`, Tailwind CSS, vitest.

---

## File Map

**New files:**
- `src/lib/core/toast-bus.svelte.ts` — toast queue with auto-expire
- `src/lib/core/toast-bus.test.ts` — vitest coverage for the bus
- `src/lib/widgets/overlay/Toast.svelte` — renders the bus
- `src/lib/widgets/overlay/Tooltip.svelte`
- `src/lib/widgets/overlay/Popover.svelte`
- `src/lib/widgets/overlay/HoverCard.svelte`
- `src/lib/widgets/display/Chip.svelte`
- `src/lib/widgets/display/Kbd.svelte`
- `src/lib/widgets/display/StatusDot.svelte`
- `src/lib/widgets/display/Trend.svelte`
- `src/lib/widgets/display/Icon.svelte`
- `src/lib/widgets/display/Icon.test.ts`
- `src/lib/widgets/display/Copy.svelte`
- `src/lib/widgets/display/Code.svelte` (inline)
- `src/lib/widgets/display/Loading.svelte`
- `src/lib/widgets/composite/AvatarGroup.svelte`
- `src/lib/components/ui/hover-card/*` — added by `bunx shadcn-svelte add`
- `src/routes/showcase/wave1/+page.svelte` — visual demo of all 13 widgets

**Modified files:**
- `src/lib/Ripple.svelte` — instantiate ToastBus, chain `onEvent`, `setContext('ui-toasts', bus)`
- `src/lib/widgets/overlay/index.ts` — export Toast, Tooltip, Popover, HoverCard
- `src/lib/widgets/display/index.ts` — export Chip, Kbd, StatusDot, Trend, Icon, Copy, Code, Loading
- `src/lib/widgets/composite/index.ts` — export AvatarGroup
- `src/lib/widgets/index.ts` — register all 13 widgets, change `code` alias from CodeBlock to new Code
- `src/routes/+layout.svelte` — add Wave 1 showcase link to topbar (optional convenience)

Working directory for every command: `D:/paw/ripple`. Use bash on Windows; the project uses Bun.

---

## Task 1: ToastBus — failing test

**Files:**
- Create: `src/lib/core/toast-bus.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/core/toast-bus.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createToastBus } from './toast-bus.svelte.js';

describe('ToastBus', () => {
  it('push adds an entry with a generated id and returns the id', () => {
    const bus = createToastBus();
    const id = bus.push({ message: 'hi', variant: 'info' });
    expect(typeof id).toBe('string');
    expect(bus.toasts).toHaveLength(1);
    expect(bus.toasts[0]).toMatchObject({ id, message: 'hi', variant: 'info' });
  });

  it('dismiss removes the entry by id', () => {
    const bus = createToastBus();
    const id = bus.push({ message: 'a', variant: 'info' });
    bus.push({ message: 'b', variant: 'info' });
    bus.dismiss(id);
    expect(bus.toasts).toHaveLength(1);
    expect(bus.toasts[0].message).toBe('b');
  });

  it('auto-dismisses after ttlMs', async () => {
    vi.useFakeTimers();
    const bus = createToastBus();
    bus.push({ message: 'a', variant: 'info', ttlMs: 1000 });
    expect(bus.toasts).toHaveLength(1);
    vi.advanceTimersByTime(1001);
    expect(bus.toasts).toHaveLength(0);
    vi.useRealTimers();
  });

  it('ttlMs of 0 disables auto-dismiss', () => {
    vi.useFakeTimers();
    const bus = createToastBus();
    bus.push({ message: 'a', variant: 'info', ttlMs: 0 });
    vi.advanceTimersByTime(60_000);
    expect(bus.toasts).toHaveLength(1);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/lib/core/toast-bus.test.ts`
Expected: FAIL — module `./toast-bus.svelte.js` not found.

---

## Task 2: ToastBus — implementation

**Files:**
- Create: `src/lib/core/toast-bus.svelte.ts`

- [ ] **Step 1: Write the implementation**

```ts
// src/lib/core/toast-bus.svelte.ts
/**
 * @file toast-bus.svelte.ts
 * @description In-process queue for toast events emitted by the EventDispatcher.
 * The Toast widget reads `toasts` and renders a stack; the host's `onEvent`
 * callback (if any) still fires, so external integrations are unchanged.
 */

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastEntry {
  id: string;
  message: string;
  variant: ToastVariant;
  ttlMs: number;
}

export interface PushInput {
  message: string;
  variant?: ToastVariant;
  ttlMs?: number;
}

export class ToastBus {
  toasts = $state<ToastEntry[]>([]);
  private nextId = 0;

  push(input: PushInput): string {
    const id = `t${++this.nextId}`;
    const ttlMs = input.ttlMs ?? 4000;
    const variant = input.variant ?? 'info';
    this.toasts.push({ id, message: input.message, variant, ttlMs });
    if (ttlMs > 0) {
      setTimeout(() => this.dismiss(id), ttlMs);
    }
    return id;
  }

  dismiss(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  clear(): void {
    this.toasts = [];
  }
}

export function createToastBus(): ToastBus {
  return new ToastBus();
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `bun run test src/lib/core/toast-bus.test.ts`
Expected: 4 PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/core/toast-bus.svelte.ts src/lib/core/toast-bus.test.ts
git commit -m "feat(ripple): toast bus for in-process toast rendering"
```

---

## Task 3: Wire ToastBus into Ripple.svelte

**Files:**
- Modify: `src/lib/Ripple.svelte`

- [ ] **Step 1: Add imports**

In the `<script>` block of `src/lib/Ripple.svelte`, alongside the other core imports near line 17, add:

```ts
import { createToastBus } from './core/toast-bus.svelte.js';
```

- [ ] **Step 2: Instantiate the bus and chain onEvent**

Replace the line `const eventDispatcher = createEventDispatcher(stateManager, onEvent, widgetRegistry);` (currently around line 62) with:

```ts
const toastBus = createToastBus();

// Chain: forward toast events into the in-process bus AND to any host onEvent.
// Hosts that already render toasts continue to work; specs that mount a
// `<toast />` widget get rendering for free.
const chainedOnEvent = (event: any) => {
  if (event && event.type === 'toast') {
    toastBus.push({
      message: typeof event.message === 'string' ? event.message : String(event.message ?? ''),
      variant: event.variant
    });
  }
  onEvent?.(event);
};

const eventDispatcher = createEventDispatcher(stateManager, chainedOnEvent, widgetRegistry);
```

- [ ] **Step 3: Expose the bus via context**

After the existing `setContext('ui-host-event', onEvent);` line (currently around line 101), append:

```ts
setContext('ui-toasts', toastBus);
```

- [ ] **Step 4: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/Ripple.svelte
git commit -m "feat(ripple): wire toast bus into Ripple root"
```

---

## Task 4: Toast widget

**Files:**
- Create: `src/lib/widgets/overlay/Toast.svelte`
- Modify: `src/lib/widgets/overlay/index.ts`

- [ ] **Step 1: Create the widget**

```svelte
<!-- src/lib/widgets/overlay/Toast.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { cn } from '$lib/utils.js';
  import type { ToastBus, ToastVariant } from '$lib/core/toast-bus.svelte.js';
  import InfoIcon from '@lucide/svelte/icons/info';
  import CheckIcon from '@lucide/svelte/icons/circle-check';
  import WarnIcon from '@lucide/svelte/icons/triangle-alert';
  import ErrorIcon from '@lucide/svelte/icons/circle-alert';
  import XIcon from '@lucide/svelte/icons/x';

  type Position = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    position?: Position;
    max?: number;
  }

  let { id, class: className, style, position = 'top-right', max = 5 }: Props = $props();

  const bus = getContext<ToastBus | undefined>('ui-toasts');

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const visible = $derived((bus?.toasts ?? []).slice(-max));

  const positionClass = $derived(
    position === 'top-left' ? 'top-4 left-4 items-start'
    : position === 'bottom-right' ? 'bottom-4 right-4 items-end'
    : position === 'bottom-left' ? 'bottom-4 left-4 items-start'
    : 'top-4 right-4 items-end' // default top-right
  );

  function variantIcon(v: ToastVariant) {
    return v === 'success' ? CheckIcon
      : v === 'warning' ? WarnIcon
      : v === 'error' ? ErrorIcon
      : InfoIcon;
  }

  function variantTone(v: ToastVariant) {
    return v === 'success' ? 'text-emerald-600 dark:text-emerald-400'
      : v === 'warning' ? 'text-amber-600 dark:text-amber-400'
      : v === 'error' ? 'text-rose-600 dark:text-rose-400'
      : 'text-blue-600 dark:text-blue-400';
  }

  const flyOffset = $derived(position.startsWith('top') ? -16 : 16);
</script>

{#if bus}
  <div
    {id}
    class={cn('fixed z-[100] flex flex-col gap-2 pointer-events-none', positionClass, className)}
    style={styleString}
    aria-live="polite"
    aria-atomic="true"
  >
    {#each visible as toast (toast.id)}
      {@const Icon = variantIcon(toast.variant)}
      <div
        class="pointer-events-auto flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2 shadow-lg min-w-[220px] max-w-[360px]"
        in:fly={{ y: flyOffset, duration: 200 }}
        out:fade={{ duration: 150 }}
      >
        <span class={cn('mt-0.5', variantTone(toast.variant))}>
          <Icon size={16} />
        </span>
        <p class="text-sm leading-snug flex-1">{toast.message}</p>
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
          onclick={() => bus.dismiss(toast.id)}
        >
          <XIcon size={14} />
        </button>
      </div>
    {/each}
  </div>
{/if}
```

- [ ] **Step 2: Update overlay barrel**

Replace the contents of `src/lib/widgets/overlay/index.ts` with:

```ts
/**
 * @file overlay/index.ts
 * @description Barrel export for overlay widgets.
 */
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
export { default as Alert } from './Alert.svelte';
export { default as DropdownMenu } from './DropdownMenu.svelte';
export { default as Toast } from './Toast.svelte';
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/widgets/overlay/Toast.svelte src/lib/widgets/overlay/index.ts
git commit -m "feat(ripple): toast widget rendering the in-process bus"
```

---

## Task 5: Install hover-card primitive

**Files:**
- Create: `src/lib/components/ui/hover-card/*` (generated by shadcn-svelte CLI)

- [ ] **Step 1: Run the shadcn-svelte add command**

Run: `bunx shadcn-svelte@latest add hover-card`
Expected: writes files under `src/lib/components/ui/hover-card/`. If the CLI prompts for path confirmation, accept the defaults.

- [ ] **Step 2: Verify the primitive exists**

Run: `ls src/lib/components/ui/hover-card/`
Expected: at least `index.ts`, `hover-card.svelte`, `hover-card-trigger.svelte`, `hover-card-content.svelte`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/ui/hover-card components.json
git commit -m "feat(ripple): add shadcn hover-card primitive"
```

(`components.json` may or may not change; `git add` is a no-op if it didn't.)

---

## Task 6: Tooltip widget

**Files:**
- Create: `src/lib/widgets/overlay/Tooltip.svelte`
- Modify: `src/lib/widgets/overlay/index.ts`

- [ ] **Step 1: Create the widget**

```svelte
<!-- src/lib/widgets/overlay/Tooltip.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';

  type Side = 'top' | 'right' | 'bottom' | 'left';
  type Align = 'start' | 'center' | 'end';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Trigger as a Ripple spec node, or a plain string. Snippet children
     *  win when provided. */
    trigger?: any;
    /** Tooltip body text. */
    content?: string;
    side?: Side;
    align?: Align;
    /** Open delay in ms. */
    delay?: number;
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style, trigger, content,
    side = 'top', align = 'center', delay = 200,
    children, hasChildren = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const triggerIsString = $derived(typeof trigger === 'string');
  const triggerIsSpec = $derived(trigger != null && typeof trigger === 'object');
</script>

<Tooltip.Provider delayDuration={delay}>
  <Tooltip.Root>
    <Tooltip.Trigger {id} class={cn(className)} style={styleString}>
      {#if hasChildren && children}
        {@render children()}
      {:else if triggerIsString}
        {trigger}
      {:else if triggerIsSpec}
        <NodeRenderer node={trigger} />
      {/if}
    </Tooltip.Trigger>
    {#if content}
      <Tooltip.Content {side} {align}>
        {content}
      </Tooltip.Content>
    {/if}
  </Tooltip.Root>
</Tooltip.Provider>
```

- [ ] **Step 2: Update overlay barrel**

Replace `src/lib/widgets/overlay/index.ts` with:

```ts
/**
 * @file overlay/index.ts
 * @description Barrel export for overlay widgets.
 */
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
export { default as Alert } from './Alert.svelte';
export { default as DropdownMenu } from './DropdownMenu.svelte';
export { default as Toast } from './Toast.svelte';
export { default as Tooltip } from './Tooltip.svelte';
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/widgets/overlay/Tooltip.svelte src/lib/widgets/overlay/index.ts
git commit -m "feat(ripple): tooltip widget"
```

---

## Task 7: Popover widget

**Files:**
- Create: `src/lib/widgets/overlay/Popover.svelte`
- Modify: `src/lib/widgets/overlay/index.ts`

- [ ] **Step 1: Create the widget**

```svelte
<!-- src/lib/widgets/overlay/Popover.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';

  type Side = 'top' | 'right' | 'bottom' | 'left';
  type Align = 'start' | 'center' | 'end';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    trigger?: any;
    content?: any;
    side?: Side;
    align?: Align;
    open?: boolean;
    onopenchange?: (open: boolean) => void;
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style, trigger, content,
    side = 'bottom', align = 'center', open, onopenchange,
    children, hasChildren = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function isString(v: unknown): v is string {
    return typeof v === 'string';
  }
  function isSpec(v: unknown): boolean {
    return v != null && typeof v === 'object';
  }
</script>

<Popover.Root bind:open onOpenChange={onopenchange}>
  <Popover.Trigger {id} class={cn(className)} style={styleString}>
    {#if hasChildren && children}
      {@render children()}
    {:else if isString(trigger)}
      {trigger}
    {:else if isSpec(trigger)}
      <NodeRenderer node={trigger} />
    {/if}
  </Popover.Trigger>
  <Popover.Content {side} {align}>
    {#if isString(content)}
      <p class="text-sm">{content}</p>
    {:else if isSpec(content)}
      <NodeRenderer node={content} />
    {/if}
  </Popover.Content>
</Popover.Root>
```

- [ ] **Step 2: Update overlay barrel**

Replace `src/lib/widgets/overlay/index.ts` with:

```ts
/**
 * @file overlay/index.ts
 * @description Barrel export for overlay widgets.
 */
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
export { default as Alert } from './Alert.svelte';
export { default as DropdownMenu } from './DropdownMenu.svelte';
export { default as Toast } from './Toast.svelte';
export { default as Tooltip } from './Tooltip.svelte';
export { default as Popover } from './Popover.svelte';
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/widgets/overlay/Popover.svelte src/lib/widgets/overlay/index.ts
git commit -m "feat(ripple): popover widget"
```

---

## Task 8: HoverCard widget

**Files:**
- Create: `src/lib/widgets/overlay/HoverCard.svelte`
- Modify: `src/lib/widgets/overlay/index.ts`

- [ ] **Step 1: Inspect the installed primitive**

Run: `cat src/lib/components/ui/hover-card/index.ts`
Note the exported names (typically `Root`, `Trigger`, `Content`). Use those in the widget below — if the CLI emitted different names, adjust accordingly before continuing.

- [ ] **Step 2: Create the widget**

```svelte
<!-- src/lib/widgets/overlay/HoverCard.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as HoverCard from '$lib/components/ui/hover-card/index.js';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';

  type Side = 'top' | 'right' | 'bottom' | 'left';
  type Align = 'start' | 'center' | 'end';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    trigger?: any;
    content?: any;
    side?: Side;
    align?: Align;
    openDelay?: number;
    closeDelay?: number;
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style, trigger, content,
    side = 'bottom', align = 'center',
    openDelay = 300, closeDelay = 150,
    children, hasChildren = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function isString(v: unknown): v is string { return typeof v === 'string'; }
  function isSpec(v: unknown): boolean { return v != null && typeof v === 'object'; }
</script>

<HoverCard.Root {openDelay} {closeDelay}>
  <HoverCard.Trigger {id} class={cn(className)} style={styleString}>
    {#if hasChildren && children}
      {@render children()}
    {:else if isString(trigger)}
      {trigger}
    {:else if isSpec(trigger)}
      <NodeRenderer node={trigger} />
    {/if}
  </HoverCard.Trigger>
  <HoverCard.Content {side} {align}>
    {#if isString(content)}
      <p class="text-sm">{content}</p>
    {:else if isSpec(content)}
      <NodeRenderer node={content} />
    {/if}
  </HoverCard.Content>
</HoverCard.Root>
```

- [ ] **Step 3: Update overlay barrel**

Replace `src/lib/widgets/overlay/index.ts` with:

```ts
/**
 * @file overlay/index.ts
 * @description Barrel export for overlay widgets.
 */
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
export { default as Alert } from './Alert.svelte';
export { default as DropdownMenu } from './DropdownMenu.svelte';
export { default as Toast } from './Toast.svelte';
export { default as Tooltip } from './Tooltip.svelte';
export { default as Popover } from './Popover.svelte';
export { default as HoverCard } from './HoverCard.svelte';
```

- [ ] **Step 4: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/widgets/overlay/HoverCard.svelte src/lib/widgets/overlay/index.ts
git commit -m "feat(ripple): hover-card widget"
```

---

## Task 9: Icon widget — failing test

**Files:**
- Create: `src/lib/widgets/display/Icon.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/widgets/display/Icon.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Icon from './Icon.svelte';
import { tick } from 'svelte';

describe('Icon', () => {
  it('renders a placeholder span before the icon resolves', () => {
    const { container } = render(Icon, { props: { name: 'check', size: 24 } });
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span!.style.width).toBe('24px');
    expect(span!.style.height).toBe('24px');
  });

  it('resolves a known lucide icon and renders its svg', async () => {
    const { container } = render(Icon, { props: { name: 'check', size: 16 } });
    // Allow the dynamic import to resolve.
    await new Promise((r) => setTimeout(r, 50));
    await tick();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('keeps the placeholder when the icon name is unknown', async () => {
    const { container } = render(Icon, { props: { name: '__not_a_real_icon__', size: 12 } });
    await new Promise((r) => setTimeout(r, 50));
    await tick();
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('span')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Verify @testing-library/svelte is installed**

Run: `grep -E '"@testing-library/svelte"' package.json`
Expected: a line in the dependencies. If the result is empty, install it: `bun add -d @testing-library/svelte jsdom` and add `test: { environment: 'jsdom' }` to `vite.config.ts` if not already configured.

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run test src/lib/widgets/display/Icon.test.ts`
Expected: FAIL — `Icon.svelte` does not exist.

---

## Task 10: Icon widget — implementation

**Files:**
- Create: `src/lib/widgets/display/Icon.svelte`

- [ ] **Step 1: Create the widget**

```svelte
<!-- src/lib/widgets/display/Icon.svelte -->
<script lang="ts">
  import type { Component } from 'svelte';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Lucide icon slug (kebab-case), e.g. "chevron-right". */
    name: string;
    size?: number;
    strokeWidth?: number;
    color?: string;
  }

  let { id, class: className, style, name, size = 16, strokeWidth = 2, color }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let IconComponent = $state<Component | null>(null);
  let resolvedName = $state<string | null>(null);

  $effect(() => {
    let cancelled = false;
    const target = name;
    IconComponent = null;
    resolvedName = null;
    if (!target) return;
    // Vite analyzes this template literal at build-time and code-splits each
    // icon module — tree-shaking is preserved.
    import(`@lucide/svelte/icons/${target}.js`)
      .then((m) => {
        if (cancelled) return;
        IconComponent = m.default ?? null;
        resolvedName = target;
      })
      .catch(() => {
        if (cancelled) return;
        IconComponent = null;
        resolvedName = null;
      });
    return () => { cancelled = true; };
  });
</script>

{#if IconComponent}
  <IconComponent {id} class={cn(className)} style={styleString} {size} {strokeWidth} {color} />
{:else}
  <span
    {id}
    class={cn('inline-block', className)}
    style="width:{size}px;height:{size}px;{styleString ?? ''}"
    aria-hidden="true"
  ></span>
{/if}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `bun run test src/lib/widgets/display/Icon.test.ts`
Expected: 3 PASS.

- [ ] **Step 3: Update display barrel**

Append to `src/lib/widgets/display/index.ts`:

```ts
export { default as Icon } from './Icon.svelte';
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/widgets/display/Icon.svelte src/lib/widgets/display/Icon.test.ts src/lib/widgets/display/index.ts
git commit -m "feat(ripple): icon widget with dynamic lucide loading"
```

---

## Task 11: Loading widget

**Files:**
- Create: `src/lib/widgets/display/Loading.svelte`
- Modify: `src/lib/widgets/display/index.ts`

- [ ] **Step 1: Create the widget**

```svelte
<!-- src/lib/widgets/display/Loading.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import LoaderIcon from '@lucide/svelte/icons/loader-2';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    size?: number;
    label?: string;
    inline?: boolean;
    showLabel?: boolean;
  }

  let {
    id, class: className, style,
    size = 16, label = 'Loading…', inline = false, showLabel = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const wrapperClass = $derived(
    inline
      ? 'inline-flex items-center gap-2'
      : 'flex items-center justify-center gap-2 py-4'
  );
</script>

<span {id} class={cn(wrapperClass, className)} style={styleString} role="status" aria-live="polite">
  <LoaderIcon {size} class="animate-spin text-muted-foreground" aria-hidden="true" />
  {#if showLabel}
    <span class="text-sm text-muted-foreground">{label}</span>
  {:else}
    <span class="sr-only">{label}</span>
  {/if}
</span>
```

- [ ] **Step 2: Update display barrel**

Append to `src/lib/widgets/display/index.ts`:

```ts
export { default as Loading } from './Loading.svelte';
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/widgets/display/Loading.svelte src/lib/widgets/display/index.ts
git commit -m "feat(ripple): loading/spinner widget"
```

---

## Task 12: Chip widget

**Files:**
- Create: `src/lib/widgets/display/Chip.svelte`
- Modify: `src/lib/widgets/display/index.ts`

- [ ] **Step 1: Create the widget**

```svelte
<!-- src/lib/widgets/display/Chip.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import XIcon from '@lucide/svelte/icons/x';

  type Variant = 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  type Size = 'sm' | 'md';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    variant?: Variant;
    size?: Size;
    closable?: boolean;
    onclose?: () => void;
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style, label,
    variant = 'default', size = 'md', closable = false, onclose,
    children, hasChildren = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const variantClass = $derived(
    variant === 'primary' ? 'bg-primary/10 text-primary border-primary/20'
    : variant === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
    : variant === 'warning' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
    : variant === 'destructive' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
    : 'bg-muted text-foreground border-border'
  );

  const sizeClass = $derived(
    size === 'sm' ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5'
  );

  const iconSize = $derived(size === 'sm' ? 10 : 12);
</script>

<span
  {id}
  class={cn('inline-flex items-center rounded-full border font-medium', variantClass, sizeClass, className)}
  style={styleString}
>
  {#if hasChildren && children}
    {@render children()}
  {:else if label}
    {label}
  {/if}
  {#if closable}
    <button
      type="button"
      class="hover:opacity-70 transition-opacity"
      aria-label="Remove"
      onclick={() => onclose?.()}
    >
      <XIcon size={iconSize} />
    </button>
  {/if}
</span>
```

- [ ] **Step 2: Update display barrel**

Append to `src/lib/widgets/display/index.ts`:

```ts
export { default as Chip } from './Chip.svelte';
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/widgets/display/Chip.svelte src/lib/widgets/display/index.ts
git commit -m "feat(ripple): chip/tag widget"
```

---

## Task 13: Kbd widget

**Files:**
- Create: `src/lib/widgets/display/Kbd.svelte`
- Modify: `src/lib/widgets/display/index.ts`

- [ ] **Step 1: Create the widget**

```svelte
<!-- src/lib/widgets/display/Kbd.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    keys: string | string[];
    separator?: string;
  }

  let { id, class: className, style, keys, separator = '+' }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const list = $derived(Array.isArray(keys) ? keys : [keys]);

  const baseClass =
    'inline-flex items-center justify-center min-w-[1.5em] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-[11px] font-mono leading-none text-muted-foreground shadow-[inset_0_-1px_0_0_var(--border)]';
</script>

<span {id} class={cn('inline-flex items-center gap-1', className)} style={styleString}>
  {#each list as key, i (i)}
    <kbd class={baseClass}>{key}</kbd>
    {#if i < list.length - 1}
      <span class="text-[11px] text-muted-foreground">{separator}</span>
    {/if}
  {/each}
</span>
```

- [ ] **Step 2: Update display barrel**

Append to `src/lib/widgets/display/index.ts`:

```ts
export { default as Kbd } from './Kbd.svelte';
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/widgets/display/Kbd.svelte src/lib/widgets/display/index.ts
git commit -m "feat(ripple): kbd widget for keyboard shortcuts"
```

---

## Task 14: StatusDot widget

**Files:**
- Create: `src/lib/widgets/display/StatusDot.svelte`
- Modify: `src/lib/widgets/display/index.ts`

- [ ] **Step 1: Create the widget**

```svelte
<!-- src/lib/widgets/display/StatusDot.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  type Variant = 'online' | 'offline' | 'busy' | 'away' | 'custom';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    variant?: Variant;
    color?: string;
    label?: string;
    pulse?: boolean;
    size?: number;
  }

  let {
    id, class: className, style,
    variant = 'online', color, label, pulse = false, size = 8
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const dotColor = $derived(
    variant === 'custom' ? (color ?? '#6b7280')
    : variant === 'offline' ? '#9ca3af'
    : variant === 'busy' ? '#ef4444'
    : variant === 'away' ? '#f59e0b'
    : '#10b981' // online
  );
</script>

<span {id} class={cn('inline-flex items-center gap-1.5', className)} style={styleString}>
  <span class="relative inline-flex" style="width:{size}px;height:{size}px">
    {#if pulse}
      <span
        class="absolute inset-0 rounded-full opacity-60 animate-ping"
        style="background-color:{dotColor}"
      ></span>
    {/if}
    <span
      class="relative inline-block rounded-full"
      style="width:{size}px;height:{size}px;background-color:{dotColor}"
    ></span>
  </span>
  {#if label}
    <span class="text-xs text-foreground">{label}</span>
  {/if}
</span>
```

- [ ] **Step 2: Update display barrel**

Append to `src/lib/widgets/display/index.ts`:

```ts
export { default as StatusDot } from './StatusDot.svelte';
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/widgets/display/StatusDot.svelte src/lib/widgets/display/index.ts
git commit -m "feat(ripple): status-dot widget"
```

---

## Task 15: Trend widget

**Files:**
- Create: `src/lib/widgets/display/Trend.svelte`
- Modify: `src/lib/widgets/display/index.ts`

- [ ] **Step 1: Create the widget**

```svelte
<!-- src/lib/widgets/display/Trend.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
  import MinusIcon from '@lucide/svelte/icons/minus';

  type Format = 'percent' | 'number' | 'currency';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    value: number;
    format?: Format;
    currency?: string;
    arrow?: boolean;
    precision?: number;
  }

  let {
    id, class: className, style,
    value, format = 'percent', currency = 'USD',
    arrow = true, precision = 1
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const numeric = $derived(typeof value === 'number' ? value : Number(value) || 0);

  const sign = $derived(numeric > 0 ? 'up' : numeric < 0 ? 'down' : 'flat');

  const toneClass = $derived(
    sign === 'up' ? 'text-emerald-600 dark:text-emerald-400'
    : sign === 'down' ? 'text-rose-600 dark:text-rose-400'
    : 'text-muted-foreground'
  );

  const formatted = $derived.by(() => {
    const abs = Math.abs(numeric);
    if (format === 'percent') return `${numeric > 0 ? '+' : numeric < 0 ? '-' : ''}${abs.toFixed(precision)}%`;
    if (format === 'currency') {
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          maximumFractionDigits: precision
        }).format(numeric);
      } catch {
        return `${numeric > 0 ? '+' : ''}${numeric.toFixed(precision)}`;
      }
    }
    return `${numeric > 0 ? '+' : ''}${numeric.toFixed(precision)}`;
  });
</script>

<span {id} class={cn('inline-flex items-center gap-0.5 text-xs font-medium tabular-nums', toneClass, className)} style={styleString}>
  {#if arrow}
    {#if sign === 'up'}
      <ArrowUpIcon size={12} />
    {:else if sign === 'down'}
      <ArrowDownIcon size={12} />
    {:else}
      <MinusIcon size={12} />
    {/if}
  {/if}
  <span>{formatted}</span>
</span>
```

- [ ] **Step 2: Update display barrel**

Append to `src/lib/widgets/display/index.ts`:

```ts
export { default as Trend } from './Trend.svelte';
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/widgets/display/Trend.svelte src/lib/widgets/display/index.ts
git commit -m "feat(ripple): trend/delta widget"
```

---

## Task 16: Copy widget

**Files:**
- Create: `src/lib/widgets/display/Copy.svelte`
- Modify: `src/lib/widgets/display/index.ts`

- [ ] **Step 1: Create the widget**

```svelte
<!-- src/lib/widgets/display/Copy.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import CheckIcon from '@lucide/svelte/icons/check';

  type Size = 'sm' | 'md';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    value: string;
    label?: string;
    size?: Size;
  }

  let { id, class: className, style, value, label, size = 'md' }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      copied = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => (copied = false), 1500);
    } catch (e) {
      console.warn('[ripple/copy] clipboard write failed:', e);
    }
  }

  const sizeClass = $derived(size === 'sm' ? 'text-[11px] px-1.5 py-0.5 gap-1' : 'text-xs px-2 py-1 gap-1.5');
  const iconSize = $derived(size === 'sm' ? 11 : 13);
</script>

<button
  {id}
  type="button"
  class={cn('inline-flex items-center rounded border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors', sizeClass, className)}
  style={styleString}
  onclick={copy}
  aria-label={copied ? 'Copied' : (label ? `Copy ${label}` : 'Copy to clipboard')}
>
  {#if copied}
    <CheckIcon size={iconSize} />
  {:else}
    <CopyIcon size={iconSize} />
  {/if}
  {#if label}
    <span>{copied ? 'Copied' : label}</span>
  {/if}
</button>
```

- [ ] **Step 2: Update display barrel**

Append to `src/lib/widgets/display/index.ts`:

```ts
export { default as Copy } from './Copy.svelte';
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/widgets/display/Copy.svelte src/lib/widgets/display/index.ts
git commit -m "feat(ripple): copy-to-clipboard widget"
```

---

## Task 17: Code (inline) widget + alias migration

**Files:**
- Create: `src/lib/widgets/display/Code.svelte`
- Modify: `src/lib/widgets/display/index.ts`

- [ ] **Step 1: Create the widget**

```svelte
<!-- src/lib/widgets/display/Code.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    value?: string;
    children?: Snippet;
    hasChildren?: boolean;
  }

  let { id, class: className, style, value, children, hasChildren = false }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<code
  {id}
  class={cn('px-1 py-0.5 rounded bg-muted text-[0.875em] font-mono text-foreground', className)}
  style={styleString}
>
  {#if hasChildren && children}
    {@render children()}
  {:else if value}
    {value}
  {/if}
</code>
```

- [ ] **Step 2: Update display barrel**

Append to `src/lib/widgets/display/index.ts`:

```ts
export { default as Code } from './Code.svelte';
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/widgets/display/Code.svelte src/lib/widgets/display/index.ts
git commit -m "feat(ripple): inline code widget"
```

The registry alias change happens in Task 19, alongside the rest of the registry diff.

---

## Task 18: AvatarGroup widget

**Files:**
- Create: `src/lib/widgets/composite/AvatarGroup.svelte`
- Modify: `src/lib/widgets/composite/index.ts`

- [ ] **Step 1: Create the widget**

```svelte
<!-- src/lib/widgets/composite/AvatarGroup.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import * as Avatar from '$lib/components/ui/avatar/index.js';

  type Size = 'sm' | 'md' | 'lg';

  interface User {
    src?: string;
    alt?: string;
    fallback?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    users: User[];
    max?: number;
    size?: Size;
  }

  let { id, class: className, style, users, max = 4, size = 'md' }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const sizeClass = $derived(
    size === 'sm' ? 'size-6 text-[10px]'
    : size === 'lg' ? 'size-10 text-sm'
    : 'size-8 text-xs'
  );

  const visible = $derived((users ?? []).slice(0, max));
  const overflow = $derived(Math.max(0, (users ?? []).length - max));

  function initials(u: User): string {
    if (u.fallback) return u.fallback;
    if (u.alt) {
      const parts = u.alt.split(/\s+/).filter(Boolean);
      return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
    }
    return '?';
  }
</script>

<Avatar.Group {id} class={cn(className)} style={styleString}>
  {#each visible as user, i (i)}
    <Avatar.Root class={sizeClass}>
      {#if user.src}
        <Avatar.Image src={user.src} alt={user.alt ?? ''} />
      {/if}
      <Avatar.Fallback>{initials(user)}</Avatar.Fallback>
    </Avatar.Root>
  {/each}
  {#if overflow > 0}
    <Avatar.GroupCount class={sizeClass}>+{overflow}</Avatar.GroupCount>
  {/if}
</Avatar.Group>
```

- [ ] **Step 2: Update composite barrel**

Replace `src/lib/widgets/composite/index.ts` with:

```ts
export { default as Terminal } from './Terminal.svelte';
export { default as RippleFrame } from './RippleFrame.svelte';
export { default as AvatarGroup } from './AvatarGroup.svelte';
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/widgets/composite/AvatarGroup.svelte src/lib/widgets/composite/index.ts
git commit -m "feat(ripple): avatar-group widget"
```

---

## Task 19: Register all 13 widgets

**Files:**
- Modify: `src/lib/widgets/index.ts`

- [ ] **Step 1: Update overlay imports**

Find the line:
```ts
import { ConfirmDialog, Alert, DropdownMenu } from './overlay/index.js';
```
Replace with:
```ts
import { ConfirmDialog, Alert, DropdownMenu, Toast, Tooltip, Popover, HoverCard } from './overlay/index.js';
```

- [ ] **Step 2: Update display imports**

Find the line beginning with `import { Text, Heading, Image, Badge,` and append the new exports. Replace it with:
```ts
import { Text, Heading, Image, Badge, Progress, Avatar, Metric, Stat, Feed, SoulStatus, Skeleton, Markdown, CodeBlock, EmptyState, ProsCons, ComparisonTable, Steps, Quote, Highlight, DefinitionList, ArticleMeta, Icon, Loading, Chip, Kbd, StatusDot, Trend, Copy, Code } from './display/index.js';
```

- [ ] **Step 3: Update composite imports**

Find the line:
```ts
import { Terminal, RippleFrame } from './composite/index.js';
```
Replace with:
```ts
import { Terminal, RippleFrame, AvatarGroup } from './composite/index.js';
```

- [ ] **Step 4: Register the new widgets and fix the `code` alias**

Locate the `defaultRegistry` block in `src/lib/widgets/index.ts`. Find the existing line:
```ts
  'code-block': CodeBlock,
  code: CodeBlock,
```
Replace those two lines with:
```ts
  'code-block': CodeBlock,
  code: Code,                         // CHANGED — inline; use 'code-block' for fenced
```

Then, just above the `// Aliases` comment (currently `label: Text,` is the last entry before the closing brace), add the new registrations:
```ts
  // Wave 1 additions
  tooltip: Tooltip,
  popover: Popover,
  'hover-card': HoverCard,
  hovercard: HoverCard,
  toast: Toast,
  loading: Loading,
  spinner: Loading,
  chip: Chip,
  tag: Chip,
  kbd: Kbd,
  'status-dot': StatusDot,
  status: StatusDot,
  trend: Trend,
  delta: Trend,
  icon: Icon,
  copy: Copy,
  'avatar-group': AvatarGroup,
```

- [ ] **Step 5: Update the bottom re-export block**

Find the `export { … }` block at the bottom of the file and add the new names. Append to the existing block:
```ts
,
  Toast, Tooltip, Popover, HoverCard,
  Icon, Loading, Chip, Kbd, StatusDot, Trend, Copy, Code,
  AvatarGroup
```

(If your editor strips the trailing comma awkwardness, just merge the names into the existing `export { … }` list.)

- [ ] **Step 6: Type-check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 7: Run all tests**

Run: `bun run test`
Expected: PASS — including `toast-bus.test.ts` and `Icon.test.ts`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/widgets/index.ts
git commit -m "feat(ripple): register wave 1 widgets, switch 'code' to inline variant"
```

---

## Task 20: Wave 1 showcase route

**Files:**
- Create: `src/routes/showcase/wave1/+page.svelte`

- [ ] **Step 1: Create the showcase page**

```svelte
<!-- src/routes/showcase/wave1/+page.svelte -->
<script lang="ts">
  import { Ripple } from '$lib/index.js';

  const spec = {
    version: '1.0' as const,
    state: { chipOpen: true, popoverOpen: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '32px' },
      class: 'p-8 max-w-5xl mx-auto',
      children: [
        { type: 'page-header', props: { eyebrow: 'WAVE 1', title: 'Wave 1 Widgets', subtitle: '13 widgets that close out the gap audit' } },

        // Inline micros
        { type: 'heading', props: { text: 'Inline micros', level: 3 } },
        {
          type: 'card',
          children: [
            {
              type: 'flex',
              props: { gap: '12px', wrap: 'wrap', align: 'center' },
              children: [
                { type: 'chip', props: { label: 'default' } },
                { type: 'chip', props: { label: 'primary', variant: 'primary' } },
                { type: 'chip', props: { label: 'success', variant: 'success' } },
                { type: 'chip', props: { label: 'warning', variant: 'warning' } },
                { type: 'chip', props: { label: 'destructive', variant: 'destructive' } },
                { type: 'chip', props: { label: 'closable', variant: 'primary', closable: true } },
                { type: 'kbd', props: { keys: ['⌘', 'K'] } },
                { type: 'kbd', props: { keys: 'Enter' } },
                { type: 'status-dot', props: { variant: 'online', label: 'Online', pulse: true } },
                { type: 'status-dot', props: { variant: 'busy', label: 'Busy' } },
                { type: 'status-dot', props: { variant: 'away', label: 'Away' } },
                { type: 'status-dot', props: { variant: 'offline', label: 'Offline' } },
                { type: 'trend', props: { value: 12.4 } },
                { type: 'trend', props: { value: -3.2 } },
                { type: 'trend', props: { value: 0 } },
                { type: 'trend', props: { value: 1500, format: 'currency' } },
                { type: 'icon', props: { name: 'sparkles', size: 18 } },
                { type: 'icon', props: { name: 'zap', size: 18 } },
                { type: 'icon', props: { name: 'rocket', size: 18 } },
                { type: 'copy', props: { value: 'sk_test_abc123', label: 'API key' } },
                {
                  type: 'text',
                  props: { text: 'Inline ', size: 'sm' },
                  class: 'inline'
                },
                { type: 'code', props: { value: 'const x = 1' } }
              ]
            }
          ]
        },

        // Loading + Avatar group
        { type: 'heading', props: { text: 'Loading & avatar-group', level: 3 } },
        {
          type: 'card',
          children: [
            {
              type: 'flex',
              props: { gap: '24px', align: 'center', wrap: 'wrap' },
              children: [
                { type: 'loading', props: { showLabel: true, label: 'Loading…', inline: true } },
                {
                  type: 'avatar-group',
                  props: {
                    size: 'md',
                    max: 3,
                    users: [
                      { fallback: 'AB' },
                      { fallback: 'CD' },
                      { fallback: 'EF' },
                      { fallback: 'GH' },
                      { fallback: 'IJ' }
                    ]
                  }
                }
              ]
            }
          ]
        },

        // Overlays
        { type: 'heading', props: { text: 'Overlays (hover/click to interact)', level: 3 } },
        {
          type: 'card',
          children: [
            {
              type: 'flex',
              props: { gap: '24px', align: 'center', wrap: 'wrap' },
              children: [
                {
                  type: 'tooltip',
                  props: { content: 'I am a tooltip', side: 'top' },
                  hasChildren: true,
                  children: [
                    { type: 'button', props: { label: 'Hover me', variant: 'outline' } }
                  ]
                },
                {
                  type: 'popover',
                  props: {
                    side: 'bottom',
                    content: {
                      type: 'flex',
                      props: { direction: 'column', gap: '8px' },
                      children: [
                        { type: 'heading', props: { text: 'Popover content', level: 5 } },
                        { type: 'text', props: { text: 'Click outside to dismiss.', size: 'sm' } }
                      ]
                    }
                  },
                  hasChildren: true,
                  children: [
                    { type: 'button', props: { label: 'Open popover', variant: 'outline' } }
                  ]
                },
                {
                  type: 'hover-card',
                  props: {
                    side: 'bottom',
                    content: {
                      type: 'flex',
                      props: { gap: '8px', align: 'center' },
                      children: [
                        { type: 'avatar-group', props: { users: [{ fallback: 'JD' }] } },
                        {
                          type: 'flex',
                          props: { direction: 'column' },
                          children: [
                            { type: 'text', props: { text: 'Jane Doe', weight: 'semibold' } },
                            { type: 'text', props: { text: 'Software engineer', size: 'sm' } }
                          ]
                        }
                      ]
                    }
                  },
                  hasChildren: true,
                  children: [
                    { type: 'button', props: { label: 'Hover for card', variant: 'outline' } }
                  ]
                }
              ]
            }
          ]
        },

        // Toast
        { type: 'heading', props: { text: 'Toast', level: 3 } },
        {
          type: 'card',
          children: [
            {
              type: 'flex',
              props: { gap: '8px', wrap: 'wrap' },
              children: [
                { type: 'button', props: { label: 'Info toast' }, on_click: { action: 'toast', message: 'Saved.', variant: 'info' } },
                { type: 'button', props: { label: 'Success toast', variant: 'outline' }, on_click: { action: 'toast', message: 'All done!', variant: 'success' } },
                { type: 'button', props: { label: 'Warning toast', variant: 'outline' }, on_click: { action: 'toast', message: 'Heads up.', variant: 'warning' } },
                { type: 'button', props: { label: 'Error toast', variant: 'destructive' }, on_click: { action: 'toast', message: 'Something failed.', variant: 'error' } }
              ]
            },
            { type: 'toast', props: { position: 'bottom-right' } }
          ]
        }
      ]
    }
  };
</script>

<Ripple {spec} />
```

- [ ] **Step 2: Run the dev server and eyeball the showcase**

Run: `bun run dev`
Open `http://localhost:5173/showcase/wave1` (port may differ — check console output).

Verify visually:
- Chips render in five variants; the closable one shows the `x` button
- Kbd renders `⌘ + K` with proper styling
- All four status dots render with the right colors; "Online" pulses
- Trend shows green up arrow, red down arrow, muted dash, and currency formatting
- Lucide icons (`sparkles`, `zap`, `rocket`) appear after a brief delay
- Copy widget swaps to a check icon for ~1.5s when clicked
- Inline `code` is a small monospace pill (not a fenced block)
- Loading spinner spins; avatar-group shows 3 + "+2"
- Tooltip appears on hover; popover toggles on click; hover-card appears after hover delay
- Each toast button pushes a toast top-right by default — but this widget overrides via `position: 'bottom-right'`. Toasts auto-dismiss after 4s.

Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add src/routes/showcase/wave1/+page.svelte
git commit -m "feat(ripple): showcase route for wave 1 widgets"
```

---

## Task 21: Final verification

- [ ] **Step 1: Type-check the whole library**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 2: Full test suite**

Run: `bun run test`
Expected: all tests pass — including the new toast-bus and Icon tests.

- [ ] **Step 3: Library build smoke test**

Run: `bun run build`
Expected: build succeeds; `dist/` populated. Check the build output for any lucide-related warnings (the dynamic-import pattern in Icon should produce per-icon chunks). If Vite warns about the dynamic import, see "Risks" in the spec for the fallback approach (eager-import a known set of icons via a glob).

- [ ] **Step 4: Push the branch (do not merge)**

```bash
git status
git log --oneline -25
```

Confirm the commit graph contains the wave 1 commits in a clean order, then leave the branch for the user to push and review.

---

## Spec Coverage Check

| Spec section | Implemented in |
|---|---|
| Toast bus module | Tasks 1–2 |
| Toast wiring in Ripple.svelte | Task 3 |
| Toast widget | Task 4 |
| Hover-card primitive install | Task 5 |
| Tooltip widget | Task 6 |
| Popover widget | Task 7 |
| HoverCard widget | Task 8 |
| Icon widget | Tasks 9–10 |
| Loading widget | Task 11 |
| Chip widget | Task 12 |
| Kbd widget | Task 13 |
| StatusDot widget | Task 14 |
| Trend widget | Task 15 |
| Copy widget | Task 16 |
| Code (inline) widget + alias migration | Tasks 17, 19 |
| AvatarGroup widget | Task 18 |
| Registry diff | Task 19 |
| Toast bus tests | Task 1 |
| Icon tests | Task 9 |
| Playground showcase | Task 20 |
| Final smoke (build + check + test) | Task 21 |
