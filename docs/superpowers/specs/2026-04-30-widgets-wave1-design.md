# Wave 1 Widgets — Design

**Date:** 2026-04-30
**Source audit:** `docs/plans/2026-04-27-widget-gap-audit.md`
**Scope:** 13 net-new widgets that close out Wave 1 of the audit and add the cheapest §6 inline micros.

## Goal

Ship the remaining Wave 1 widgets so LLM-generated specs cover the inline / micro / overlay surface area without needing host-app glue. Bias toward the smallest possible component per widget; only one widget (toast) and one mechanism (icon dynamic import) require non-trivial design.

## Widget Inventory

| Group | Widget | Registry key(s) | Wraps |
|---|---|---|---|
| Overlay | Tooltip | `tooltip` | `components/ui/tooltip` |
| Overlay | Popover | `popover` | `components/ui/popover` |
| Overlay | HoverCard | `hover-card` | `components/ui/hover-card` (NEW) |
| Feedback | Toast | `toast` | new ToastBus + custom render |
| Feedback | Loading | `loading`, `spinner` | `@lucide/svelte/icons/loader-2` |
| Inline | Chip | `chip`, `tag` | none — pure markup |
| Inline | Kbd | `kbd` | `<kbd>` element |
| Inline | StatusDot | `status-dot`, `status` | none |
| Inline | Trend | `trend`, `delta` | lucide arrow icons |
| Inline | Icon | `icon` | `@lucide/svelte` (dynamic) |
| Inline | Copy | `copy` | `navigator.clipboard` + lucide |
| Inline | Code | `code` | `<code>` element |
| Composite | AvatarGroup | `avatar-group` | `components/ui/avatar` (group primitives already present) |

**Alias migration.** `code` is currently aliased to `CodeBlock`. After this change `code` renders the new inline component, and fenced multi-line content must use `code-block`. This is a breaking change for any spec author using `code` for fenced output, but it aligns with the audit's split between inline and block code.

## Conventions Every Widget Follows

Reference implementations: `widgets/input/Slider.svelte`, `widgets/overlay/Alert.svelte`.

```ts
interface Props {
  id?: string;
  class?: string;
  style?: Record<string, string>;
  // …widget-specific props
}

let { id, class: className, style, /* … */ }: Props = $props();

const styleString = $derived(
  style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
);
```

- Class merging via `cn()` from `$lib/utils.js`.
- All widgets use Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`).
- Files placed in their existing category folder (`overlay/`, `display/`, `composite/`); category `index.ts` re-exports them; `widgets/index.ts` registers the widget keys.
- Tailwind utility classes only — no new CSS files.
- Lucide icons imported from `@lucide/svelte/icons/<name>` (already a dep — see `widgets/overlay/Alert.svelte`).

## Toast Bus

EventDispatcher already emits `{ type: 'toast', message, variant }` to its `onEvent` callback. Today only the host app sees it. The `<toast />` widget needs an in-process subscription so a spec can render its own toasts without host wiring.

### Module — `src/lib/core/toast-bus.svelte.ts`

```ts
export interface ToastEntry {
  id: string;          // generated unique id
  message: string;
  variant: 'info' | 'success' | 'warning' | 'error';
  ttlMs: number;
}

export class ToastBus {
  toasts = $state<ToastEntry[]>([]);
  private nextId = 0;

  push(entry: Omit<ToastEntry, 'id' | 'ttlMs'> & { ttlMs?: number }): string {
    const id = `t${++this.nextId}`;
    const ttlMs = entry.ttlMs ?? 4000;
    this.toasts.push({ id, ttlMs, ...entry });
    if (ttlMs > 0) setTimeout(() => this.dismiss(id), ttlMs);
    return id;
  }

  dismiss(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}

export function createToastBus(): ToastBus { return new ToastBus(); }
```

### Wiring — `src/lib/Ripple.svelte`

- Construct one `ToastBus` per Ripple instance.
- `setContext('ui-toasts', bus)` so `<Toast>` widgets resolve it.
- Wrap the user-supplied `onEvent` with a chained handler:

```ts
const userOnEvent = onEvent;
const internalOnEvent = (event: UIEvent) => {
  if (event.type === 'toast') {
    bus.push({
      message: event.message,
      variant: event.variant ?? 'info'
    });
  }
  userOnEvent?.(event);
};
```

The host's `onEvent` still fires — host integrations remain untouched. The bus only renders toasts when a `<toast />` widget is mounted somewhere in the spec.

### Toast widget — `src/lib/widgets/overlay/Toast.svelte`

Props:

| Prop | Type | Default | Notes |
|---|---|---|---|
| `position` | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` | Fixed-position container |
| `max` | `number` | `5` | Cap *visible* toasts; the bus still tracks all entries, the renderer just shows the last `max` |

Render: fixed-position stack of cards. Each toast shows its `message`, a variant icon (lucide `info`/`circle-check`/`triangle-alert`/`circle-alert`), and a dismiss button. Mount/unmount transitions via Svelte's built-in `fly` + `fade`.

## Icon Widget Specifics

Lucide ships each icon as its own module to preserve tree-shaking. The Icon widget supports any icon by dynamic import.

```svelte
<script lang="ts">
  import type { Component } from 'svelte';
  let { name, size = 16, strokeWidth = 2, class: className, color }: {
    name: string; size?: number; strokeWidth?: number; class?: string; color?: string;
  } = $props();

  let IconComponent = $state<Component | null>(null);

  $effect(() => {
    let cancelled = false;
    import(`@lucide/svelte/icons/${name}.js`)
      .then((m) => { if (!cancelled) IconComponent = m.default; })
      .catch(() => { if (!cancelled) IconComponent = null; });
    return () => { cancelled = true; };
  });
</script>

{#if IconComponent}
  <IconComponent {size} {strokeWidth} class={className} {color} />
{:else}
  <span style="display:inline-block;width:{size}px;height:{size}px"></span>
{/if}
```

The fallback `<span>` reserves layout while the icon resolves. Errors silently fall back too — an LLM generating a typo'd icon name shouldn't break the page. Bundlers preserve dynamic-import code-splitting; tree-shaking still works because each icon is its own module.

## Inline Micros

Each widget is intentionally one screen of code. Specs below describe surface only.

### `chip` (Chip)
Props: `label?: string`, `variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive'`, `size?: 'sm' | 'md'`, `closable?: boolean`, `onclose?: () => void`. Renders a pill; if `closable`, shows a small `x` button that emits `onclose`. `tag` is an alias.

### `kbd` (Kbd)
Props: `keys: string | string[]`. Renders `<kbd>` with subtle border and monospace. If `keys` is an array, joins with `+` separator wrapped between individual `<kbd>` elements.

### `status-dot` (StatusDot)
Props: `variant?: 'online' | 'offline' | 'busy' | 'away' | 'custom'`, `color?: string` (used when `custom`), `label?: string`, `pulse?: boolean`. Colored circle (`bg-emerald-500`, `bg-zinc-400`, `bg-rose-500`, `bg-amber-500`) + optional label text. `pulse` adds a Tailwind ping animation.

### `trend` (Trend)
Props: `value: number`, `format?: 'percent' | 'number' | 'currency'`, `currency?: string` (default `USD`), `arrow?: boolean` (default `true`), `precision?: number` (default `1`). Auto color: positive → `text-emerald-600`, negative → `text-rose-600`, zero → `text-muted-foreground`. Arrow uses lucide `arrow-up` / `arrow-down` / horizontal dash. `delta` is an alias.

### `copy` (Copy)
Props: `value: string` (text to copy), `label?: string` (when omitted renders icon-only), `size?: 'sm' | 'md'`. Click calls `navigator.clipboard.writeText(value)`; swaps icon from lucide `copy` to `check` for ~1500ms; restores. No-op if clipboard API unavailable.

### `code` (inline)
Props: `value?: string`, children allowed. Renders `<code class="px-1 py-0.5 rounded bg-muted text-sm font-mono">…</code>`. Single-line — distinct from `code-block`.

### `loading` (Loading)
Props: `size?: number` (default `16`), `label?: string` (sr-only by default), `inline?: boolean` (default `false`), `showLabel?: boolean` (default `false`). Renders lucide `loader-2` with `animate-spin`. When `inline` is false, centers in a flex container.

### `avatar-group` (AvatarGroup)
Props: `users: { src?: string; alt?: string; fallback?: string }[]`, `max?: number` (default `4`), `size?: 'sm' | 'md' | 'lg'` (default `'md'`). Uses the existing `avatar-group` and `avatar-group-count` primitives in `components/ui/avatar/`. Overflow renders `+N`.

## Overlay Widgets

### Common shape

All three accept either snippet children for the trigger, or a `trigger` prop that may be a string or a `UISpec`. Likewise for `content`. When a UISpec is passed, render it via `NodeRenderer` (the same recursion `RippleFrame` uses) so nested expressions, events, and state bindings work.

### `tooltip` (Tooltip)

| Prop | Type | Default |
|---|---|---|
| `trigger` | `UISpec \| string` | — (falls back to snippet children) |
| `content` | `string` | required |
| `side` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'top'` |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` |
| `delay` | `number` | `200` |

Tooltip content is text-only by design — anything richer should use `popover`. The trigger is whatever's wrapped: snippet children take precedence over the `trigger` prop, since most authoring contexts already have the trigger element nearby.

### `popover` (Popover)

Same as Tooltip but `content: UISpec | string`, plus `open?: boolean` (state-bindable for controlled use), and emits `onopenchange` for two-way sync. No delay.

### `hover-card` (HoverCard)

Same as Popover with `openDelay?: number` (default `300`) and `closeDelay?: number` (default `150`). For mention/user previews.

**Primitive install.** `hover-card` doesn't yet exist under `src/lib/components/ui/`. Add via `bunx shadcn-svelte@latest add hover-card` (bits-ui already installed).

## File Layout

```
src/lib/widgets/
  overlay/
    Tooltip.svelte           NEW
    Popover.svelte           NEW
    HoverCard.svelte         NEW
    Toast.svelte             NEW
    index.ts                 +4 exports
  display/
    Chip.svelte              NEW
    Kbd.svelte               NEW
    StatusDot.svelte         NEW
    Trend.svelte             NEW
    Icon.svelte              NEW
    Copy.svelte              NEW
    Code.svelte              NEW (inline)
    Loading.svelte           NEW
    index.ts                 +8 exports
  composite/
    AvatarGroup.svelte       NEW
    index.ts                 +1 export
src/lib/core/
  toast-bus.svelte.ts        NEW
src/lib/Ripple.svelte         MODIFIED — instantiate ToastBus, chain onEvent, setContext
src/lib/components/ui/
  hover-card/                NEW (shadcn-svelte add)
src/lib/widgets/index.ts     MODIFIED — register 13 widgets, change `code` alias
```

### Registry diff (`widgets/index.ts`)

Add to imports:

```ts
import { Tooltip, Popover, HoverCard, Toast } from './overlay/index.js';
import { Chip, Kbd, StatusDot, Trend, Icon, Copy, Code, Loading } from './display/index.js';
import { AvatarGroup } from './composite/index.js';
```

Add to `defaultRegistry`:

```ts
tooltip: Tooltip,
popover: Popover,
'hover-card': HoverCard,
toast: Toast,
chip: Chip, tag: Chip,
kbd: Kbd,
'status-dot': StatusDot, status: StatusDot,
trend: Trend, delta: Trend,
icon: Icon,
copy: Copy,
code: Code,                  // CHANGED — was aliased to CodeBlock
loading: Loading, spinner: Loading,
'avatar-group': AvatarGroup,
```

Add the same names to the bottom `export { … }` block.

## Testing

Existing widgets have no test coverage. Add minimal vitest tests only for the two pieces with logic:

- `toast-bus.test.ts` — push assigns id, dismiss removes by id, auto-expire after ttl, max cap drops oldest, dispatcher → bus chaining
- `Icon.test.ts` — resolves a known icon, swallows unknown name, fallback span has correct size

The remaining 11 widgets are visual wrappers; verification is manual via the playground showcase.

## Playground Showcase

Add a `widgets-wave1` Ripple spec to the playground (alongside the existing `pockets` / `playground` specs added in commits 698a288 and 9a00c7f). The spec demonstrates all 13 widgets with a small example for each, grouped by category. Linked from the topbar so it's easy to eyeball regressions.

## Out of Scope

Explicitly deferred to later waves:

- §6 micros not in this set: `mention`, `link-preview`, `qr`, `diff` — each needs its own brainstorm
- Wave 2 enterprise: `data-grid`, `combobox`, `date-picker`, `file-upload`, `command-palette`, `form`, `filter-bar`, `breadcrumb`, `split`, `master-detail`, `kanban`, `tree`, `virtual-list`
- Wave 3 visualizations and verticals

## Risks

- **Code alias migration** — any existing host spec using `code` for fenced output renders inline after this change. Mitigation: search for `type: 'code'` usages in `paw-enterprise` before the change lands; flag in the PR description.
- **Dynamic icon import path** — Vite needs the import string to be statically analyzable enough to know the directory. The pattern `\`@lucide/svelte/icons/${name}.js\`` works because Vite's glob analysis picks up the prefix; verify during implementation by running `bun run build` and checking the chunk graph.
- **Toast double-render** — if a host already renders toasts via its own `onEvent` *and* the spec mounts `<toast />`, both will fire. Mitigation: document this in the Toast widget's prop docs; host can either drop the spec widget or stop handling `toast` events itself.
