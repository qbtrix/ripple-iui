# Ripple Themable Tokens + Chrome Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a customizable Ripple theme via namespaced CSS variables, strip default card chrome from non-card widgets, and fix dead-feeling buttons (cursor + hover).

**Architecture:** Add a `ripple/src/lib/theme.css` shipping `--ripple-*` tokens (defaulting to shadcn equivalents) plus a Tailwind `@theme inline` block exposing them as utilities (`bg-ripple-surface`, `rounded-ripple`, etc.). Migrate the three semantic-surface widgets (Card UI component, Card layout widget, Alert) to the new tokens. Strip `bg-card` from 13 decorative/layout widgets so the host owns the surface. Fix `button.svelte` cursor + default-variant hover. paw-enterprise imports the new stylesheet and adds scoped overrides for chat-inline vs pocket-pane contexts.

**Tech Stack:** Svelte 5 runes, Tailwind CSS 4, svelte-package, Bun, paw-enterprise (SvelteKit + Tauri).

**Reference:** Design doc — `ripple/docs/plans/2026-05-05-ripple-themable-tokens-design.md`.

---

## Conventions for this plan

- Ripple has no test suite (`bun run test` exists but no tests). Verification is via `bun run check` (svelte-check) for type/template hygiene and a paw-enterprise smoke test at the end.
- Each task ends with a commit. Commit messages use the convention from `git log` in ripple — check the repo before writing the first commit message and match the prevailing style. If unclear, use Conventional Commits (`feat:`, `fix:`, `refactor:`).
- Working dir is `D:/paw/ripple` for tasks 1–17, `D:/paw/paw-enterprise` for tasks 18–20.
- Do NOT add `Co-Authored-By` trailers unless the user has explicitly asked for them in this session — if they have, follow the project convention.

---

## Task 1: Create the theme stylesheet

**Files:**
- Create: `ripple/src/lib/theme.css`

**Step 1: Write the file**

Create `D:/paw/ripple/src/lib/theme.css` with:

```css
/* Ripple theme tokens.
   Hosts may override any --ripple-* custom property in a scoped selector
   (e.g. `.my-context .ripple-root { --ripple-surface: transparent; }`)
   to retheme Ripple per render context without polluting the global
   shadcn token set. Defaults below cascade from the host's shadcn tokens
   so doing nothing keeps the existing look. */

:root {
  --ripple-surface: var(--card);
  --ripple-surface-foreground: var(--card-foreground);
  --ripple-muted: var(--muted);
  --ripple-muted-foreground: var(--muted-foreground);
  --ripple-accent: var(--primary);
  --ripple-accent-foreground: var(--primary-foreground);
  --ripple-border: var(--border);
  --ripple-ring: var(--ring);
  --ripple-radius: var(--radius);
}

@theme inline {
  --color-ripple-surface: var(--ripple-surface);
  --color-ripple-surface-foreground: var(--ripple-surface-foreground);
  --color-ripple-muted: var(--ripple-muted);
  --color-ripple-muted-foreground: var(--ripple-muted-foreground);
  --color-ripple-accent: var(--ripple-accent);
  --color-ripple-accent-foreground: var(--ripple-accent-foreground);
  --color-ripple-border: var(--ripple-border);
  --color-ripple-ring: var(--ripple-ring);
  --radius-ripple: var(--ripple-radius);
}
```

**Step 2: Verify it lands in dist after build (deferred to task 17)**

No build yet — checked end-to-end after migration is complete.

**Step 3: Commit**

```bash
git add ripple/src/lib/theme.css
git commit -m "feat(ripple): add themable token stylesheet (theme.css)"
```

---

## Task 2: Export theme.css from the package

**Files:**
- Modify: `ripple/package.json`

**Step 1: Read current exports**

Look at the `exports` field. It currently has `.`, `./widgets`, `./schema`, `./streaming`.

**Step 2: Add the CSS export entry**

Add a new `./theme.css` entry. The whole `exports` block should look like:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "svelte": "./dist/index.js",
    "default": "./dist/index.js"
  },
  "./widgets": {
    "types": "./dist/widgets/index.d.ts",
    "svelte": "./dist/widgets/index.js",
    "default": "./dist/widgets/index.js"
  },
  "./schema": {
    "types": "./dist/schema/index.d.ts",
    "default": "./dist/schema/index.js"
  },
  "./streaming": {
    "types": "./dist/streaming/index.d.ts",
    "svelte": "./dist/streaming/index.js",
    "default": "./dist/streaming/index.js"
  },
  "./theme.css": "./dist/theme.css"
}
```

The CSS export is a plain string (no conditions) — bundlers and the Tailwind v4 `@import` resolver both follow that.

**Step 3: Commit**

```bash
git add ripple/package.json
git commit -m "feat(ripple): export theme.css from package"
```

---

## Task 3: Fix button cursor + default hover

**Files:**
- Modify: `ripple/src/lib/components/ui/button/button.svelte:7,10`

**Step 1: Update base classes (line 7)**

Add `cursor-pointer` to the very start of the base string. The base currently begins with `"focus-visible:border-ring ..."`. Change to:

```ts
base: "cursor-pointer focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 active:translate-y-px aria-invalid:ring-3 [&_svg:not([class*='size-'])]:size-4 group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
```

`disabled:pointer-events-none` later in the chain already prevents cursor on disabled buttons, so no extra work needed.

**Step 2: Fix the default variant hover (line 10)**

Replace:
```ts
default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
```

With:
```ts
default: "bg-primary text-primary-foreground hover:bg-primary/90",
```

The `[a]:hover:bg-primary/80` selector only fires on `<a>` elements — plain `<button>` had no hover at all. The new `hover:` works for both because it targets the element directly. We keep the existing `link` variant separate for true link styling.

**Step 3: Run check**

```bash
cd D:/paw/ripple
bun run check
```

Expected: no new errors introduced (existing errors, if any, unchanged).

**Step 4: Commit**

```bash
git add ripple/src/lib/components/ui/button/button.svelte
git commit -m "fix(ripple): add cursor-pointer and proper hover to default button"
```

---

## Task 4: Migrate button.svelte to Ripple tokens

**Files:**
- Modify: `ripple/src/lib/components/ui/button/button.svelte:9-15`

**Step 1: Read the variants block**

Lines 9–15 are the current `variants.variant` map.

**Step 2: Update each variant**

Replace the variant map with:

```ts
variant: {
  default: "bg-ripple-accent text-ripple-accent-foreground hover:bg-ripple-accent/90",
  outline: "border-ripple-border bg-ripple-surface hover:bg-ripple-muted hover:text-ripple-surface-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-ripple-muted aria-expanded:text-ripple-surface-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
  ghost: "hover:bg-ripple-muted hover:text-ripple-surface-foreground dark:hover:bg-ripple-muted/50 aria-expanded:bg-ripple-muted aria-expanded:text-ripple-surface-foreground",
  destructive: "bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30",
  link: "text-ripple-accent underline-offset-4 hover:underline",
},
```

Notes:
- `secondary` and `destructive` keep their shadcn tokens — they're variant-specific colors that wouldn't typically be host-rethemed and adding `--ripple-secondary` / `--ripple-destructive` is YAGNI.
- The `dark:bg-input/30` etc. references stay as shadcn `--input` because we don't expose a Ripple input token.

**Step 3: Run check**

```bash
bun run check
```

Expected: no new errors.

**Step 4: Commit**

```bash
git add ripple/src/lib/components/ui/button/button.svelte
git commit -m "refactor(ripple): migrate button to ripple-* tokens"
```

---

## Task 5: Migrate Alert to Ripple tokens

**Files:**
- Modify: `ripple/src/lib/components/ui/alert/alert.svelte:5-10`

**Step 1: Update variants**

Replace lines 5–10 (the `alertVariants` `tv()` block). The new content:

```ts
export const alertVariants = tv({
    base: "grid gap-0.5 rounded-ripple border border-ripple-border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 group/alert relative w-full",
    variants: {
        variant: {
            default: "bg-ripple-surface text-ripple-surface-foreground",
            destructive: "text-destructive bg-ripple-surface *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});
```

Changes: `rounded-lg` → `rounded-ripple`, `border` (which used the global `border-color: var(--border)` rule) → explicit `border-ripple-border`, `bg-card text-card-foreground` → `bg-ripple-surface text-ripple-surface-foreground`.

**Step 2: Run check**

```bash
bun run check
```

**Step 3: Commit**

```bash
git add ripple/src/lib/components/ui/alert/alert.svelte
git commit -m "refactor(ripple): migrate alert to ripple-* tokens"
```

---

## Task 6: Migrate the shadcn Card UI component

**Files:**
- Modify: `ripple/src/lib/components/ui/card/card.svelte:18`

**Step 1: Update the class string on the wrapper div**

Line 18 currently:
```
class={cn("ring-foreground/10 bg-card text-card-foreground gap-4 overflow-hidden rounded-xl py-4 ...
```

Change `bg-card` → `bg-ripple-surface`, `text-card-foreground` → `text-ripple-surface-foreground`, `rounded-xl` → `rounded-ripple`, `ring-foreground/10` → `ring-ripple-border`.

The full new class string:
```
"ring-ripple-border bg-ripple-surface text-ripple-surface-foreground gap-4 overflow-hidden rounded-ripple py-4 text-sm ring-1 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-ripple *:[img:last-child]:rounded-b-ripple group/card flex flex-col"
```

Note: the inner image-corner classes (`rounded-t-xl`, `rounded-b-xl`) also become `rounded-t-ripple`, `rounded-b-ripple` so the radius stays consistent with the outer.

**Step 2: Run check**

```bash
bun run check
```

**Step 3: Commit**

```bash
git add ripple/src/lib/components/ui/card/card.svelte
git commit -m "refactor(ripple): migrate card component to ripple-* tokens"
```

---

## Task 7: Migrate the layout Card widget

**Files:**
- Modify: `ripple/src/lib/widgets/layout/Card.svelte:38-62`

**Step 1: Update the `tv()` block**

Replace the `card` variants object (lines 38–62):

```ts
const card = tv({
  base: 'relative flex flex-col rounded-ripple bg-ripple-surface text-ripple-surface-foreground transition-colors',
  variants: {
    variant: {
      default: 'border border-ripple-border',
      muted: 'border border-ripple-border bg-ripple-muted',
      outlined: 'border border-foreground/15',
      selected: 'border border-ripple-border ring-1 ring-inset ring-ripple-accent',
      glass: 'border border-white/10 bg-black/40 backdrop-blur-md backdrop-saturate-150',
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
```

Changes: `rounded-[8px]` → `rounded-ripple`, `bg-card text-card-foreground` → `bg-ripple-surface text-ripple-surface-foreground`, `border-border` → `border-ripple-border` (in default/muted/selected variants), `bg-muted` → `bg-ripple-muted`, `ring-primary` → `ring-ripple-accent`. The `outlined` and `glass` variants keep their hard-coded styling (intentional alternative looks).

**Step 2: Update the inner footer divider (line 121)**

Change:
```
class="mt-auto pt-2 border-t border-border/60"
```
to:
```
class="mt-auto pt-2 border-t border-ripple-border/60"
```

**Step 3: Run check**

```bash
bun run check
```

**Step 4: Commit**

```bash
git add ripple/src/lib/widgets/layout/Card.svelte
git commit -m "refactor(ripple): migrate Card layout widget to ripple-* tokens"
```

---

## Task 8: Strip chrome from Quote widget

**Files:**
- Modify: `ripple/src/lib/widgets/display/Quote.svelte:33`

**Step 1: Remove the card-style wrapper**

Line 33 currently:
```
class={cn('flex flex-col gap-4 rounded-lg border border-border bg-card/40 p-5', className)}
```

Replace with:
```
class={cn('flex flex-col gap-4 p-5', className)}
```

The figure becomes typography-only — no border, no background. Padding stays so author/avatar still breathe. Host wraps in a `Card` if chrome is wanted.

**Step 2: Commit**

```bash
git add ripple/src/lib/widgets/display/Quote.svelte
git commit -m "refactor(ripple): strip card chrome from Quote widget"
```

---

## Task 9: Strip chrome from Highlight (Metric) widget

**Files:**
- Modify: `ripple/src/lib/widgets/display/Highlight.svelte:44`

**Step 1: Remove the card-style wrapper**

Line 44 currently:
```
class={cn('flex flex-col gap-1 rounded-lg border border-border bg-card/40 p-5', className)}
```

Replace with:
```
class={cn('flex flex-col gap-1 p-5', className)}
```

**Step 2: Commit**

```bash
git add ripple/src/lib/widgets/display/Highlight.svelte
git commit -m "refactor(ripple): strip card chrome from Highlight widget"
```

---

## Task 10: Strip chrome from Steps widget

**Files:**
- Modify: `ripple/src/lib/widgets/display/Steps.svelte:39,64`

**Step 1: Update the horizontal pip**

Line 39 — the numbered circle in horizontal layout:
```
class="flex size-7 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold tabular-nums"
```

Replace with:
```
class="flex size-7 items-center justify-center rounded-full border border-ripple-border bg-ripple-muted/40 text-sm font-semibold tabular-nums"
```

**Step 2: Update the vertical pip**

Line 64 — same change in the vertical branch:
```
class="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold tabular-nums"
```

Replace with:
```
class="flex size-7 shrink-0 items-center justify-center rounded-full border border-ripple-border bg-ripple-muted/40 text-sm font-semibold tabular-nums"
```

The pip needs *some* background to be visible against any host surface — `bg-ripple-muted/40` gives a subtle tint that follows the host theme.

**Step 3: Commit**

```bash
git add ripple/src/lib/widgets/display/Steps.svelte
git commit -m "refactor(ripple): retint Steps pip with ripple-muted (no card chrome)"
```

---

## Task 11: Strip chrome from LinkPreview widget

**Files:**
- Modify: `ripple/src/lib/widgets/display/LinkPreview.svelte:62`

**Step 1: Remove the card surface**

Line 62 currently:
```
'group block max-w-md rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-primary/40 hover:bg-muted/30',
```

Replace with:
```
'group block max-w-md rounded-ripple border border-ripple-border overflow-hidden transition-colors hover:border-ripple-accent/40 hover:bg-ripple-muted/30',
```

The link card needs a border (it's interactive and needs an affordance), but no fill — host surface shows through. Hover still tints subtly via `bg-ripple-muted/30`.

**Step 2: Commit**

```bash
git add ripple/src/lib/widgets/display/LinkPreview.svelte
git commit -m "refactor(ripple): replace LinkPreview card chrome with ripple tokens"
```

---

## Task 12: Strip chrome from Diff widget

**Files:**
- Modify: `ripple/src/lib/widgets/display/Diff.svelte:127,131`

**Step 1: Remove outer bg-card**

Line 127 currently:
```
class={cn('rounded-md border border-border bg-card overflow-hidden', className)}
```

Replace with:
```
class={cn('rounded-ripple border border-ripple-border overflow-hidden', className)}
```

**Step 2: Update the title bar bg**

Line 131:
```
class="border-b border-border bg-muted/30 px-3 py-1.5 text-xs font-mono text-muted-foreground"
```

Replace with:
```
class="border-b border-ripple-border bg-ripple-muted/30 px-3 py-1.5 text-xs font-mono text-muted-foreground"
```

**Step 3: Commit**

```bash
git add ripple/src/lib/widgets/display/Diff.svelte
git commit -m "refactor(ripple): replace Diff card chrome with ripple tokens"
```

---

## Task 13: Strip chrome from vertical-layout widgets (batch)

**Files:**
- Modify: `ripple/src/lib/widgets/vertical/SettingsList.svelte`
- Modify: `ripple/src/lib/widgets/vertical/PricingTable.svelte`
- Modify: `ripple/src/lib/widgets/vertical/OrgChart.svelte`
- Modify: `ripple/src/lib/widgets/vertical/BulkActionBar.svelte`

**Step 1: For each file, search for `bg-card` occurrences**

Run for each file:
```
grep -n "bg-card" ripple/src/lib/widgets/vertical/SettingsList.svelte
```
(repeat per file)

**Step 2: Replace each occurrence**

Apply this rule per match:
- If it's an outer wrapper (`rounded-* border border-border bg-card …`) → drop `bg-card` entirely (host owns surface) and migrate `border-border` → `border-ripple-border`, `rounded-lg`/`rounded-md` → `rounded-ripple` if present.
- If it's a *highlighted row / accent block* inside (e.g. selected row, summary row) → swap `bg-card` for `bg-ripple-muted/40`.

When in doubt, prefer dropping (matches the design's "decorative chrome — strip" rule).

**Step 3: Run check after each file**

```bash
bun run check
```

If a file's edit causes an error, undo and ask the user before proceeding.

**Step 4: Commit (one commit per file, or one combined commit if changes are uniform)**

Either:
```bash
git add ripple/src/lib/widgets/vertical/SettingsList.svelte
git commit -m "refactor(ripple): strip card chrome from SettingsList"
```
…repeat per file, or batch:
```bash
git add ripple/src/lib/widgets/vertical/
git commit -m "refactor(ripple): strip card chrome from vertical-layout widgets"
```

Prefer per-file commits if the diffs are non-trivial.

---

## Task 14: Strip chrome from data widgets (batch)

**Files:**
- Modify: `ripple/src/lib/widgets/data/Tree.svelte`
- Modify: `ripple/src/lib/widgets/data/Kanban.svelte`
- Modify: `ripple/src/lib/widgets/data/Calendar.svelte`

**Step 1: For each file, find `bg-card` occurrences**

```
grep -n "bg-card" ripple/src/lib/widgets/data/Tree.svelte
grep -n "bg-card" ripple/src/lib/widgets/data/Kanban.svelte
grep -n "bg-card" ripple/src/lib/widgets/data/Calendar.svelte
```

**Step 2: Apply the same rule as Task 13**

- Outer wrapper → drop `bg-card`; migrate `border-border` → `border-ripple-border`.
- Inner accent surfaces (Kanban column header, Calendar today-cell) → `bg-ripple-muted/40`.
- For Kanban specifically, if columns themselves used `bg-card`, swap to `bg-ripple-muted/30` — columns need *some* visual separation or they bleed together.

**Step 3: Run check**

```bash
bun run check
```

**Step 4: Commit**

```bash
git add ripple/src/lib/widgets/data/
git commit -m "refactor(ripple): strip card chrome from data widgets"
```

---

## Task 15: Strip chrome from layout widgets (Sidebar, MasterDetail, AppShell)

**Files:**
- Modify: `ripple/src/lib/widgets/layout/Sidebar.svelte`
- Modify: `ripple/src/lib/widgets/layout/MasterDetail.svelte`
- Modify: `ripple/src/lib/widgets/layout/AppShell.svelte`

**Step 1: Find bg-card per file**

```
grep -n "bg-card" ripple/src/lib/widgets/layout/Sidebar.svelte
grep -n "bg-card" ripple/src/lib/widgets/layout/MasterDetail.svelte
grep -n "bg-card" ripple/src/lib/widgets/layout/AppShell.svelte
```

**Step 2: Drop `bg-card` entirely from outer chrome**

Layout widgets are layout primitives — the host provides the surface. Drop `bg-card` everywhere it's the outer wrapper.

If an internal divider (e.g. resizable handle) uses `bg-card` as a hover affordance, swap to `bg-ripple-muted/60` so it stays visible.

Migrate `border-border` → `border-ripple-border` on these layout widgets.

**Step 3: Run check**

```bash
bun run check
```

**Step 4: Commit**

```bash
git add ripple/src/lib/widgets/layout/Sidebar.svelte ripple/src/lib/widgets/layout/MasterDetail.svelte ripple/src/lib/widgets/layout/AppShell.svelte
git commit -m "refactor(ripple): strip card chrome from layout widgets"
```

---

## Task 16: Strip chrome from FileUpload

**Files:**
- Modify: `ripple/src/lib/widgets/input/FileUpload.svelte`

**Step 1: Find bg-card**

```
grep -n "bg-card" ripple/src/lib/widgets/input/FileUpload.svelte
```

**Step 2: Apply rule**

- The outer container should drop `bg-card`.
- The dropzone (drag-target) typically uses a dashed border + tinted background. Swap its `bg-card` to `bg-ripple-muted/30` so it stays visible against any host surface.

**Step 3: Run check**

```bash
bun run check
```

**Step 4: Commit**

```bash
git add ripple/src/lib/widgets/input/FileUpload.svelte
git commit -m "refactor(ripple): strip card chrome from FileUpload"
```

---

## Task 17: Build ripple and verify dist contains theme.css

**Files:**
- No edits (build only)

**Step 1: Build**

```bash
cd D:/paw/ripple
bun run build
```

Expected: `svelte-package` runs, then `bun run scripts/build-manifest.ts`.

**Step 2: Verify theme.css landed**

```bash
ls dist/theme.css
```

Expected: file exists. If it doesn't, `svelte-package` may have skipped it — check whether `src/lib/theme.css` is excluded by something in `svelte.config.js`. If so, add the file to the package's `files` field (it's already included via `dist/**`, but the upstream copy from `src/lib/` to `dist/` may need a config tweak — investigate before continuing).

**Step 3: Verify content**

```bash
head -5 dist/theme.css
```

Expected: starts with `/* Ripple theme tokens.` comment.

**Step 4: Verify exports resolution from paw-enterprise side**

```bash
ls D:/paw/paw-enterprise/node_modules/@ripple-ui/svelte/dist/theme.css
```

Expected: file resolves through the `file:../ripple` symlink. If not, run `bun install` in paw-enterprise to refresh.

**Step 5: No commit yet — build artifacts are gitignored**

```bash
git status
```

Expected: clean (or only `bun.lock` changes, which can be committed as part of paw-enterprise's task 18).

---

## Task 18: Import theme.css in paw-enterprise

**Files:**
- Modify: `paw-enterprise/src/styles/global.css`

**Step 1: Add the import near the top**

After the existing `@import "@fontsource-variable/jetbrains-mono";` line, add:

```css
@import "@ripple-ui/svelte/theme.css";
```

The file should now have:
```css
@import "tailwindcss";
@import "tw-animate-css";

@source "../../node_modules/@ripple-ui/svelte/dist";
@import "@fontsource-variable/inter";
@import "@fontsource-variable/jetbrains-mono";
@import "@ripple-ui/svelte/theme.css";

@custom-variant dark (&:is(.dark *));
```

**Step 2: Run dev to verify import resolves**

```bash
cd D:/paw/paw-enterprise
bun run dev
```

Wait for "ready in N ms". Open http://localhost:1420. If the page loads without a CSS resolution error in the terminal or the browser console, the import works.

If the import fails: check that `@ripple-ui/svelte` resolves at all (`ls node_modules/@ripple-ui/svelte/dist/theme.css`) and that Tailwind's `@import` step understands package-style paths (it does in v4 via the Vite plugin).

Stop the dev server before continuing.

**Step 3: Commit**

```bash
git add paw-enterprise/src/styles/global.css
git commit -m "feat(paw-enterprise): import @ripple-ui/svelte theme.css"
```

---

## Task 19: Add scoped Ripple theme overrides for chat-inline and pocket-pane

**Files:**
- Modify: `paw-enterprise/src/styles/global.css`

**Step 1: Identify the host containers**

The two render contexts are:
- **Inline ripple in chat** — rendered inside `MarkdownRenderer.svelte`, which itself sits inside chat message bubbles.
- **Pocket pane** — rendered by `PocketRenderer.svelte` inside `PocketPaneSlot.svelte`.

Open both files briefly to confirm the outermost class/data-attribute on each render container. Pick a stable selector — preferably an existing class on the renderer's root, not a brittle nth-child path.

**Step 2: Add scoped overrides**

Append to the bottom of `paw-enterprise/src/styles/global.css` (before the `.mention` block is fine; place wherever fits the file's existing section ordering):

```css
/* ---------------------------------------------------------------------------
   Ripple theme overrides per render context
   --------------------------------------------------------------------------- */

/* Inline ripple inside a chat bubble — message bubble already provides chrome,
   so Ripple should render flush. */
.markdown-renderer .ripple-root,
[data-pocket-context="chat-inline"] .ripple-root {
  --ripple-surface: transparent;
  --ripple-border: transparent;
  --ripple-radius: 0;
}

/* Ripple in a pocket pane — slightly tinted surface, larger radius to match
   the pane's chrome. */
[data-pocket-context="pane"] .ripple-root {
  --ripple-surface: color-mix(in oklab, var(--card) 96%, var(--paw-accent));
  --ripple-radius: 0.75rem;
}
```

Substitute the actual selectors based on what you found in step 1. If `MarkdownRenderer.svelte` doesn't already have a `markdown-renderer` class, either add one as part of this task or use `[data-pocket-context]` exclusively — pick one approach and apply consistently. **Don't add new wrapper divs just to scope CSS** — use existing roots.

**Step 3: If you need to add a data-attribute on a render container**

If `PocketPaneSlot.svelte` or `MarkdownRenderer.svelte` doesn't already mark its render context, add `data-pocket-context="pane"` (or `"chat-inline"`) to the existing root element. Don't introduce a wrapper — set the attribute on the existing topmost element.

**Step 4: Run dev and visually verify**

```bash
bun run dev
```

In the browser:
1. Trigger an inline-ripple chat response (any spec with a Card or Alert) — verify the card has *no* surface fill or border, blends with the bubble.
2. Open a pocket pane that renders a Ripple spec with a Card — verify the card has the slight accent tint and larger radius.
3. Click any button in either context — verify cursor changes to pointer and hover state activates.

Stop dev server before committing.

**Step 5: Commit**

```bash
git add paw-enterprise/src/styles/global.css
# Plus any minimal data-attribute additions to renderer files
git commit -m "feat(paw-enterprise): scope ripple theme per render context"
```

---

## Task 20: Smoke test — dead-button bug, button colors, card chrome

**Files:**
- No edits — pure verification.

**Step 1: Start paw-enterprise dev**

```bash
cd D:/paw/paw-enterprise
bun run dev
```

**Step 2: Verify each fix in the browser**

Walk through this checklist with the user watching:

1. **Cursor**: hover over any Ripple-rendered button — cursor changes to pointer. ✅/❌
2. **Hover color (default variant)**: a default-variant button visibly darkens on hover. ✅/❌
3. **Button colors render**: a default-variant button paints its primary fill (no transparent/un-styled buttons). If still failing, this points to Tailwind not scanning `node_modules/@ripple-ui/svelte/dist` — investigate the `@source` directive in `global.css` and the actual class strings emitted in `dist/components/ui/button/button.svelte`.
4. **Inline ripple — Card has no chrome**: render a chat-inline Card. The card body shows but no border/background — flush with the bubble. ✅/❌
5. **Pocket-pane ripple — Card has tint**: render a pocket Card. Visible subtle tinted surface, rounded corners. ✅/❌
6. **Stripped widgets are transparent**: render a Quote, Steps, or Highlight inline — they show typography only, no card chrome. ✅/❌

**Step 3: If anything fails**

Report the specific failing item to the user. Do NOT continue to merge or claim done. Common failure modes and where to look:

- "Buttons still un-styled" → check `dist/components/ui/button/button.svelte` for the migrated class strings; verify `@source` in `global.css` points at the right path; ensure `bun install` in paw-enterprise picked up the rebuilt dist.
- "Theme overrides don't apply" → check the selector matches the actual render root (DevTools → inspect element → check class/data-attribute on the `.ripple-root` element).
- "Dist missing theme.css" → svelte-package may not copy `.css` files from `src/lib`. Add a postbuild copy in `package.json` scripts: `"build": "svelte-package && cp src/lib/theme.css dist/theme.css && bun run scripts/build-manifest.ts"`.

**Step 4: If everything works, no commit needed (verification only)**

The commits from tasks 3–19 cover the actual changes. Move to the next step.

---

## Task 21: Run final type check across both projects

**Step 1: Ripple check**

```bash
cd D:/paw/ripple
bun run check
```

Expected: no NEW errors compared to baseline (check `git stash`/`git stash pop` against main if uncertain).

**Step 2: paw-enterprise check**

```bash
cd D:/paw/paw-enterprise
bun run check
```

Expected: no NEW errors. paw-enterprise has ~43 baseline type errors per its CLAUDE.md — unchanged is the bar.

**Step 3: Lint paw-enterprise (only the changed files)**

```bash
bunx eslint src/styles/global.css 2>&1 || true
```

CSS isn't ESLinted but if you touched any `.svelte` files for data-attribute additions:
```bash
bunx eslint <path/to/file.svelte>
```

Expected: clean for newly-edited files.

**Step 4: No commit (verification only)**

---

## Task 22: Update memory + finishing-touches

**Step 1: Note the new theming surface in user-facing docs**

If `ripple/docs/api-reference.md` or `ripple/docs/architecture.md` documents theming, append a "Themable tokens" section pointing at the namespaced tokens, the `theme.css` import, and the host-scoping pattern. Keep it short — link to the design doc for rationale.

If neither doc currently covers theming, skip this step. Don't create a new file unprompted.

**Step 2: Commit if you edited docs**

```bash
git add ripple/docs/
git commit -m "docs(ripple): document --ripple-* theming tokens"
```

**Step 3: Push the branch (ask user before pushing)**

Do NOT push without confirming with the user. Ripple is a sibling repo and paw-enterprise depends on it via `file:../ripple` — pushing rebuilt dist matters for any teammate pulling fresh.

---

## Notes for the executor

- **Don't refactor beyond the plan.** If you spot another `bg-card` in a widget I didn't list, leave it for a follow-up. Adding scope mid-execution makes review harder.
- **Don't add tests** unless something specifically warrants regression coverage. Ripple has no test suite today and bootstrapping one is outside the goal.
- **The Svelte 5 rules in `paw-enterprise/CLAUDE.md` apply.** Don't write `$derived(() => {...})` (use `$derived.by`); don't use `<svelte:component>`; treat editor warnings as errors.
- **If any step's "Expected" output differs from reality, stop and report.** Don't push past unexplained errors — they usually point at missing context.
