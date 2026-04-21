# JSON-Spec Schema & Snippet-Slot Lowering — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the new `Card` (header/footer snippets, density, interactive, outlined variant) and the new `Stat` widget fully addressable from JSON specs. Add a `slot` field to `UINode` and teach `NodeRenderer.svelte` to route children into named Svelte 5 snippets.

**Architecture:** Three pieces. (1) Register `Stat` in both the runtime widget registry (`widgets/index.ts`) and the Zod widget-type enum (`schema/widget-types.ts`). (2) Add `slot?: string` to `UINode` in `schema/ui-spec.ts`. (3) Extend `NodeRenderer.svelte` to partition `node.children` by `slot` and pass `header` / `footer` snippets (and any future named slot) as props, while keeping un-slotted children flowing through the default `children` snippet unchanged. Everything is additive — zero breaking changes for existing specs.

**Tech stack:** Svelte 5 snippets (first-class, assignable to props), Zod 4, vitest.

**Design reference:** `docs/plans/2026-04-14-basic-widgets-visual-quality-design.md`, `docs/plans/2026-04-15-stat-widget.md`.

**Out of scope:** Publishing / building Ripple (one `bun run build` at the end of this plan is enough — paw-enterprise consumes via `file:../ripple`). Migration of paw-enterprise `PocketsPanel.svelte` (separate follow-up). `Metric` removal.

---

## Task 1: Register `stat` + new Card props in schema

**Files:**
- Modify: `src/lib/widgets/index.ts`
- Modify: `src/lib/schema/widget-types.ts`

**Step 1 — widget runtime registry.** Open `src/lib/widgets/index.ts`.

In the import block, update the display import to include `Stat`:
```ts
import { Text, Heading, Image, Badge, Progress, Avatar, Metric, Stat, Feed, SoulStatus } from './display/index.js';
```

In `defaultRegistry`, after the `metric: Metric,` line, add:
```ts
  stat: Stat,
```

**Step 2 — widget-type enum + category map.** Open `src/lib/schema/widget-types.ts`.

Update the `z.enum([...])` — add `'stat'` to the Display row:
```ts
  // Display
  'text', 'heading', 'image', 'badge', 'progress', 'avatar', 'stat',
```

Update `WIDGET_CATEGORIES.display` — add `'stat'` after `'metric'`:
```ts
  display: ['text', 'heading', 'image', 'badge', 'progress', 'avatar', 'metric', 'stat', 'feed', 'soul-status'],
```

**Step 3 — typecheck:**
```
bun run check
```
Expect: no new errors in the two touched files.

**Step 4 — commit:**
```
git add src/lib/widgets/index.ts src/lib/schema/widget-types.ts
git commit -m "feat(ripple): register 'stat' in widget registry and type enum

Makes JSON specs addressable: { type: 'stat', props: {...} } now
resolves to the Stat widget. Category map updated for introspection."
```

---

## Task 2: Add `slot?: string` to UINode schema

**Files:**
- Modify: `src/lib/schema/ui-spec.ts`

**Step 1 — find the base UINode schema.** Read `src/lib/schema/ui-spec.ts`. Locate the `BaseUINode` (or equivalent) Zod object — the plan mentions lines 43-101 where `children` / `else_children` are defined via `z.lazy`.

**Step 2 — add `slot`.** In the base Zod schema (NOT inside the `z.lazy` children-only section), add an optional slot field. Insert it next to existing optional identity/layout fields (e.g., near `class`, `style`, `show`):
```ts
  /** When a child node is placed inside a widget with named slots (e.g., Card's header/footer),
   *  this field routes the child into that slot. Ignored for widgets without named slots. */
  slot: z.string().optional(),
```

**Step 3 — TS type.** The TypeScript interface mirrored alongside should also gain:
```ts
  slot?: string;
```
Find the hand-written TS interface in the same file (the comment at line 90 mentions "Uses z.lazy() for self-referencing children"). Add `slot?: string;` to it.

**Step 4 — typecheck:**
```
bun run check
```
No new errors.

**Step 5 — commit:**
```
git add src/lib/schema/ui-spec.ts
git commit -m "feat(ripple): add optional slot field to UINode

Enables routing children into named snippet slots (Card.header,
Card.footer, etc). Purely additive — existing specs unaffected."
```

---

## Task 3: Write failing NodeRenderer slot-routing tests

**Files:**
- Create: `src/lib/components/NodeRenderer.slots.test.ts`

Existing renderer behavior (default `children` snippet routing) must keep working. New tests cover slot routing only.

**Step 1 — write the tests.** Create `src/lib/components/NodeRenderer.slots.test.ts`:

```ts
import { render } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Ripple from '$lib/Ripple.svelte';

// Helper: render a Ripple spec and return the container
function renderSpec(root: unknown) {
  return render(Ripple, { props: { spec: { root } } });
}

test('children without slot go to the default body', () => {
  const { container } = renderSpec({
    type: 'card',
    props: { title: 'T' },
    children: [{ type: 'text', props: { text: 'body content' } }],
  });
  const body = container.querySelector('[data-slot="card-body"]');
  expect(body).not.toBeNull();
  expect(body!.textContent).toContain('body content');
});

test('child with slot="header" lands in card-header, not card-body', () => {
  const { container } = renderSpec({
    type: 'card',
    props: { title: 'T' },
    children: [
      { type: 'stat', props: { value: 42 }, slot: 'header' },
      { type: 'text', props: { text: 'body content' } },
    ],
  });
  const header = container.querySelector('[data-slot="card-header"]');
  const body = container.querySelector('[data-slot="card-body"]');
  expect(header?.textContent).toContain('42');
  expect(body?.textContent).toContain('body content');
  expect(body?.textContent ?? '').not.toContain('42');
});

test('child with slot="footer" lands in card-footer', () => {
  const { container } = renderSpec({
    type: 'card',
    props: { title: 'T' },
    children: [
      { type: 'text', props: { text: 'meta' }, slot: 'footer' },
      { type: 'text', props: { text: 'body' } },
    ],
  });
  const footer = container.querySelector('[data-slot="card-footer"]');
  expect(footer?.textContent).toContain('meta');
});

test('multiple children with same slot all render in that slot', () => {
  const { container } = renderSpec({
    type: 'card',
    props: {},
    children: [
      { type: 'text', props: { text: 'h1' }, slot: 'header' },
      { type: 'text', props: { text: 'h2' }, slot: 'header' },
      { type: 'text', props: { text: 'body' } },
    ],
  });
  const header = container.querySelector('[data-slot="card-header"]');
  expect(header?.textContent).toContain('h1');
  expect(header?.textContent).toContain('h2');
});

test('unknown slot on a widget that lacks that slot is dropped silently', () => {
  // Card has no 'sidebar' slot — the child should neither appear in body nor crash
  const { container } = renderSpec({
    type: 'card',
    props: {},
    children: [
      { type: 'text', props: { text: 'ghost' }, slot: 'sidebar' },
      { type: 'text', props: { text: 'body' } },
    ],
  });
  const body = container.querySelector('[data-slot="card-body"]');
  expect(body?.textContent).toContain('body');
  expect(body?.textContent ?? '').not.toContain('ghost');
});

test('existing no-slot specs render identically (regression guard)', () => {
  const { container } = renderSpec({
    type: 'card',
    props: { title: 'Hello' },
    children: [{ type: 'text', props: { text: 'world' } }],
  });
  expect(container.querySelector('[data-slot="card-header"]')?.textContent).toContain('Hello');
  expect(container.querySelector('[data-slot="card-body"]')?.textContent).toContain('world');
});
```

**Step 2 — run tests to confirm failure:**
```
bun run test -- --run src/lib/components/NodeRenderer.slots.test.ts
```
Expected: tests that exercise the `slot` field FAIL (children all land in the body snippet today). The "unknown slot is dropped" test will likely PASS by accident (renderer may currently drop `slot` silently or route it to body — acceptable either way, we'll fix it in Task 4).

Read `src/lib/Ripple.svelte` first if the spec shape `{ root: { ... } }` is wrong — adjust the helper accordingly. If `Ripple` expects a different prop shape (`spec` vs `root` vs `ui`), adapt.

**Step 3 — commit:**
```
git add src/lib/components/NodeRenderer.slots.test.ts
git commit -m "test(ripple): NodeRenderer slot-routing spec (failing)

Defines contract: children with slot='header'/'footer' route into
Card's named snippet slots; un-slotted children flow into default
children. Existing specs must keep working unchanged."
```

---

## Task 4: Implement slot routing in NodeRenderer

**Files:**
- Modify: `src/lib/components/NodeRenderer.svelte`

**Step 1 — read the current file carefully** (especially lines 232-253 where `WidgetComponent` is rendered with a single `children` snippet).

**Step 2 — partition children by slot.** Add a `$derived` that splits `node.children` into default + per-slot buckets. Just before the main render block (after the existing `$derived`s), introduce:

```ts
  // Partition children by slot field. Children without `slot` go to default.
  const childBuckets = $derived.by(() => {
    const buckets: { default: typeof node.children; [slot: string]: typeof node.children } = { default: [] };
    if (!node.children) return buckets;
    for (const child of node.children) {
      const key = child.slot ?? 'default';
      if (!buckets[key]) buckets[key] = [];
      (buckets[key] as any[]).push(child);
    }
    return buckets;
  });
```

**Step 3 — render named-slot snippets.** Replace the existing `<WidgetComponent {...widgetProps}>` block (around line 245) with:

```svelte
		{:else if WidgetComponent}
			<!-- Regular widget rendering -->
			{@const defaultKids = childBuckets.default ?? []}
			{@const headerKids = childBuckets.header}
			{@const footerKids = childBuckets.footer}
			{@const widgetProps = {
				id: node.id,
				...(resolvedClass !== undefined && { class: resolvedClass }),
				...(node.style !== undefined && { style: node.style }),
				...resolvedProps,
				...(boundValue !== undefined && { value: boundValue }),
				...((node.type === 'checkbox' || node.type === 'switch') && boundValue !== undefined && { checked: boundValue }),
				...(onclick !== undefined && { onclick }),
				...(onchange !== undefined && { onchange }),
				...(onsubmit !== undefined && { onsubmit }),
				...(defaultKids.length > 0 && { hasChildren: true })
			}}
			{#snippet headerSnippet()}
				{#each headerKids ?? [] as child, i (child.id ?? i)}
					<Self node={child} {loopContext} />
				{/each}
			{/snippet}
			{#snippet footerSnippet()}
				{#each footerKids ?? [] as child, i (child.id ?? i)}
					<Self node={child} {loopContext} />
				{/each}
			{/snippet}
			<WidgetComponent
				{...widgetProps}
				header={headerKids && headerKids.length > 0 ? headerSnippet : undefined}
				footer={footerKids && footerKids.length > 0 ? footerSnippet : undefined}
			>
				{#snippet children()}
					{#each defaultKids as child, i (child.id ?? i)}
						<Self node={child} {loopContext} />
					{/each}
				{/snippet}
			</WidgetComponent>
```

Notes for the implementer:
- Svelte 5 allows passing snippets as props. The `header={...}` and `footer={...}` only pass the snippet when there's content to render, so widgets that don't declare these slots (most of them) are unaffected because they simply ignore unknown props.
- `hasChildren` is now driven by `defaultKids.length`, not the raw `node.children.length` — children routed into named slots shouldn't flip `hasChildren` on for the default body.
- Slots other than `header`/`footer` are collected into `childBuckets` but not forwarded. That's intentional: widgets that want new named slots must be added to the forwarding block explicitly. For the current scope (`Card`), only header/footer exist.

**Step 4 — run the slot tests:**
```
bun run test -- --run src/lib/components/NodeRenderer.slots.test.ts
```
Expected: all tests in that file pass.

**Step 5 — run the full suite:**
```
bun run test -- --run
```
Expected: 106+ tests still pass. Zero regressions.

**Step 6 — typecheck:**
```
bun run check
```
No new errors attributable to NodeRenderer.

**Step 7 — commit:**
```
git add src/lib/components/NodeRenderer.svelte
git commit -m "feat(ripple): route UINode children by slot into named snippets

Partitions node.children by the optional slot field and forwards
header/footer children as Svelte 5 snippet props to the widget.
Un-slotted children flow through the default children snippet
as before — zero regressions for existing specs.

Makes Card's header/footer slots addressable from JSON:

  { type: 'card', children: [
    { type: 'stat', slot: 'header', props: { value: 1234 } },
    { type: 'text', props: { text: 'body' } }
  ] }"
```

---

## Task 5: Add JSON-spec showcase for Card + Stat composition

**Files:**
- Create: `src/routes/showcase/spec/+page.svelte`

Demonstrates the agent-facing side: a Card built purely from a JSON spec, with a Stat in the header slot. This is the shape paw-enterprise pockets will consume.

**Step 1 — read existing showcase structure** (`src/routes/showcase/card/+page.svelte`) to match page patterns.

**Step 2 — create the spec showcase page.** Use `Ripple` with a literal JSON spec:

```svelte
<script lang="ts">
  import { Ripple } from '$lib/index.js';

  const revenueCardSpec = {
    root: {
      type: 'card',
      props: { title: 'Monthly revenue', description: 'Last 30 days' },
      children: [
        {
          type: 'stat',
          slot: 'header',
          props: {
            value: 12450.32,
            format: 'currency',
            deltaPercent: 3.4,
            direction: 'up-good',
            size: 'sm',
            align: 'right'
          }
        },
        {
          type: 'container',
          props: { class: 'h-16 rounded bg-muted/50' },
          children: []
        },
        {
          type: 'text',
          slot: 'footer',
          props: { text: 'Updated 2m ago', class: 'text-xs text-muted-foreground' }
        }
      ]
    }
  };

  const statGridSpec = {
    root: {
      type: 'grid',
      props: { cols: 3, gap: 3 },
      children: [
        { type: 'stat', props: { label: 'Revenue', value: 12450, format: 'currency', deltaPercent: 3.4, direction: 'up-good' } },
        { type: 'stat', props: { label: 'Signups', value: 247, deltaPercent: 18.2, direction: 'up-good' } },
        { type: 'stat', props: { label: 'Churn', value: 0.034, format: 'percent', deltaPercent: -0.8, direction: 'down-good' } }
      ]
    }
  };
</script>

<div class="mx-auto max-w-4xl space-y-10 p-8">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold">JSON-spec composition</h1>
    <p class="text-muted-foreground">
      Card with Stat in the header slot, rendered from a declarative JSON spec — the shape agents emit into pockets.
    </p>
  </header>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase text-muted-foreground tracking-wide">Card + Stat via slot="header"</h2>
    <Ripple spec={revenueCardSpec} />
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase text-muted-foreground tracking-wide">Grid of stats</h2>
    <Ripple spec={statGridSpec} />
  </section>
</div>
```

Check that `Ripple` is actually re-exported from `$lib/index.js`. If not, import directly: `import Ripple from '$lib/Ripple.svelte';`.

**Step 3 — dev server smoke:**
```
bun run dev
```
Wait ~8s, confirm `/showcase/spec` compiles. Kill the server.

**Step 4 — commit:**
```
git add src/routes/showcase/spec/
git commit -m "docs(ripple): JSON-spec showcase for Card+Stat composition

Demonstrates the agent-facing path: declarative spec with
slot='header' routes a Stat into the Card's named snippet slot."
```

---

## Task 6: Build Ripple dist + verify paw-enterprise can pick it up

**Files:**
- None modified in Ripple (build output to `dist/` is gitignored)

**Step 1 — build:**
```
cd D:/paw/ripple
bun run build
```
Expect: no errors. `dist/widgets/display/Stat.svelte.d.ts`, `dist/widgets/display/Stat.svelte.js` (or similar) produced. `dist/widgets/layout/Card.svelte.*` present. `dist/components/NodeRenderer.svelte.js` reflects the slot-routing change.

**Step 2 — verify Ripple's dist entry points.**
```
ls D:/paw/ripple/dist/widgets/display/ | grep Stat
ls D:/paw/ripple/dist/widgets/layout/ | grep Card
```
Both should exist.

**Step 3 — reinstall in paw-enterprise (this makes the `file:` link re-resolve against fresh dist):**
```
cd D:/paw/paw-enterprise
bun install
```

**Step 4 — smoke-check import.** In paw-enterprise, confirm the new exports resolve. From `D:/paw/paw-enterprise`:
```
grep -rn "from '@ripple-ui/svelte'" src/ | head -5
```
Identify any one consuming file and attempt a typecheck (`bun run check`). The existing imports (`Ripple`) should keep resolving. If paw-enterprise currently only imports `Ripple` (the top-level renderer), no further action is needed — the new widgets are reachable via JSON specs, which is the intended path.

**Step 5 — no commit.** Nothing to commit in Ripple. Build output is gitignored.

---

## Verification checklist

- [ ] `bun run test -- --run` → full suite green (106 + 6 new slot tests ≈ 112+)
- [ ] `bun run check` → no new errors
- [ ] `bun run build` → succeeds, dist contains Stat + updated Card + NodeRenderer
- [ ] `/showcase/spec` renders the Card-with-header-Stat example
- [ ] `bun install` in `paw-enterprise` completes without error
- [ ] `grep -rn '\"stat\"' src/lib/` in Ripple → registered in both `widgets/index.ts` and `schema/widget-types.ts`

## Follow-ups (NOT in this plan)

- Migrate **one** `PocketsPanel.svelte` surface (the `.wd-stat-card` grid) from inline CSS to `<Card>` + `<Stat>` via JSON spec — concrete proof that the chain works end-to-end. Separate plan.
- Theme-token audit: confirm paw-enterprise defines `--card`, `--border`, `--muted`, `--ring`, `--primary` consistently with Ripple. If not, reconcile in a separate PR.
- `styles.css` oklch + brand hue rewrite.
- Generalize slot routing beyond `header`/`footer` (arbitrary named slots from widget manifest) — only needed once another widget adds its own named slots.
- `Metric` call-site migration + deletion.
