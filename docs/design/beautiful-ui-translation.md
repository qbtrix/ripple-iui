<!--
  2026-09-14 — created by lane F (foundation) of the beautiful-ui re-skin arc.
  The single mapping every port lane reads before touching a component. Built by
  reading beautiful-ui's app/globals.css (1551 lines) against what ripple's
  src/lib/theme.css actually publishes. Contains: the token/utility table, the
  9 keyframes with owners, what we drop, and the two decisions lanes A and C
  were blocked on (TaskRows, StatusPill).
-->

# beautiful-ui → ripple: the translation

**Source:** `slev12397/beautiful-ui` @ `ff0f74d` — MIT, Copyright (c) 2026 Shane
Levine. Read-only. Nothing in this repo imports from it; see `NOTICE` at the
repo root for the licence text and the provenance-header convention.

Anything not on this table is a judgement call to record here, not to invent
silently in a lane.

---

## 1. Why translate instead of copying the token layer

beautiful-ui's `text-ink-2` works because *its* `@theme inline` maps
`--color-ink-2`. Pasted into ripple the class compiles to **nothing** — no
error, no warning, just a missing colour. That is the same silent failure the
`data-open:` review pass just fixed, and for the same reason: the mapping lives
in the source repo's CSS.

Adding `--ink: var(--foreground)` to ripple would stack a third alias layer on
top of host → ripple. So: translate at port time against what ripple publishes.

Ripple's published colour tokens, verbatim from
`grep -o '\-\-color-ripple-[a-z0-9-]*' src/lib/theme.css | sort -u`:

```
--color-ripple-accent           --color-ripple-accent-foreground
--color-ripple-border           --color-ripple-error
--color-ripple-error-foreground --color-ripple-info
--color-ripple-info-foreground  --color-ripple-input
--color-ripple-input-foreground --color-ripple-muted
--color-ripple-muted-foreground --color-ripple-ring
--color-ripple-success          --color-ripple-success-foreground
--color-ripple-surface          --color-ripple-surface-foreground
--color-ripple-warning          --color-ripple-warning-foreground
```

Plus `--radius-ripple` (utility `rounded-ripple`) and, as of this slice,
`--ease-ripple-out` (utility `ease-ripple-out`).

---

## 2. Colour and surface

| beautiful-ui | ripple | note |
|---|---|---|
| `bg-surface` | `bg-ripple-surface` | |
| `text-ink` | `text-ripple-surface-foreground` | |
| `text-ink-2`, `text-ink-3` | `text-ripple-muted-foreground` | two greys collapse to one — ripple publishes no second muted step |
| `border-line`, `border-line-strong` | `ring-1 ring-ripple-border` | ripple Card uses a ring, not a border; see §5 |
| `bg-inset`, `bg-field` | `bg-ripple-muted` | |
| `bg-hover`, `bg-hover-2` | `hover:bg-ripple-accent/10` | |
| `text-accent`, `bg-accent` | `text-ripple-accent`, `bg-ripple-accent` | |
| `text-accent-ink` | `text-ripple-accent-foreground` | |
| `bg-accent-tint` | `bg-ripple-accent/10` | source tint is the colour at 14% alpha; ripple's Badge convention is `/10` — match Badge, not the source |
| `text-green`, `bg-green-tint` | `text-ripple-success`, `bg-ripple-success/10` | exactly ripple Badge's existing `success` variant |
| `text-orange`, `bg-orange-tint` | `text-ripple-warning`, `bg-ripple-warning/10` | exactly Badge's existing `warning` variant |
| `text-red`, `bg-red-tint` | `text-ripple-error`, `bg-ripple-error/10` | **see the gap in §7** — Badge maps red to shadcn `destructive`, not `ripple-error` |
| `--tooltip-bg` / `-fg` / `-muted` / `-border` | *drop* | ripple's overlay canonical (`Tooltip` from `./ui`) already owns tooltip colour |
| `--page`, `--canvas`, `--stripe`, `--stripe-bg` | *drop* | the host owns the ground — see §5 |

### Radius

| beautiful-ui | ripple |
|---|---|
| `rounded-chip` (6px) | `rounded-md` |
| `rounded-control` (8px) | `rounded-ripple` |
| `rounded-card` (10px) | `rounded-ripple` |
| `rounded-window` (14px) | `rounded-xl` |
| `rounded-full` (pills) | `rounded-full` — unchanged |

`--radius-ripple` resolves to the host's `--radius` (0.625rem = 10px by
default), so `rounded-ripple` lands on the source's card radius without a new
token. Controls at 8px vs cards at 10px is a distinction ripple does not
publish; collapse both to `rounded-ripple` rather than hard-coding `8px`.

### Type

The source sets a 14px body and writes components in arbitrary sizes:
`text-[13px]`, `text-[12.5px]`, `text-[11.5px]`, `text-[10.5px]`.

**Keep the arbitrary values verbatim.** Arbitrary Tailwind values need no theme
mapping, so `text-[13px]` compiles identically in ripple — this is the one place
where copying the source class is safe, and the 13px/medium rhythm is a real
part of the look. Do not "translate" it to `text-sm` (14px); that quietly
changes the design. `tabular-nums`, `font-medium`, `truncate`, `leading-none`,
and the whole layout/flex/grid vocabulary are stock Tailwind and also copy
across unchanged.

---

## 3. The ease token

`src/lib/theme.css` now publishes, following the file's existing two-step
convention (raw `--ripple-*` property in `:root` for host override, aliased into
`@theme inline` for the utility):

```css
:root       { --ripple-ease-out: cubic-bezier(0.22, 1, 0.36, 1); }
@theme inline { --ease-ripple-out: var(--ripple-ease-out); }
```

Two ways to use it:

- Tailwind utility: `ease-ripple-out` (compiles to
  `transition-timing-function: var(--ripple-ease-out)` — proven, §9)
- Inside a component's scoped `<style>`: `var(--ripple-ease-out)`. This is the
  main path, because keyframe animations live in per-component style blocks.

| beautiful-ui | ripple |
|---|---|
| `--ease-out-strong` / inline `cubic-bezier(0.23,1,0.32,1)` | `var(--ripple-ease-out)` |
| `cubic-bezier(0.22, 1, 0.36, 1)` (ApprovalCard `SLIDE`) | `var(--ripple-ease-out)` |
| `--ease-in-out-strong`, `--ease-link` | *not ported* — no pilot component uses them |

**Two deviations from the brief, both deliberate:**

1. **The brief names the wrong curve as the signature.**
   `cubic-bezier(0.22, 1, 0.36, 1)` occurs exactly **once** in the whole source
   (`components/primitives/ApprovalCard.tsx:57`). The curve that actually
   carries the look is `--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1)`, used
   at 20+ sites. The two are visually indistinguishable, so we ship one token at
   the brief's value and every lane routes both through it. Not worth two
   tokens.
2. **The name.** The brief suggested `--ease-out-quint`. Every other ripple
   token is `ripple`-namespaced precisely so it cannot collide with a host's own
   theme variables; an un-namespaced `--ease-out-quint` in `@theme inline` would
   break that rule. "The way the other ripple tokens are" wins over the literal
   name.

---

## 4. The 9 keyframes

**Do not create a global keyframes file and do not put these in `theme.css`.**
Ripple's convention is a per-component scoped `<style>` block with a prefixed
name — `Workflow.svelte` has `wf-dash`, `ChecklistLayout.svelte` has
`rcheck-spin`, and the four AI widgets already use the fuller
`ripple-<component>-<name>` form. A global sheet is what produced
paw-enterprise's 174 dead keyframes.

Per-component means **each owner pastes its own copy**. Two components that both
fade up do not share one keyframe; they each declare theirs. That is the point —
a component carries its own motion and a consumer importing one component gets
exactly the CSS it needs.

Every pasted block also carries the reduced-motion guard its neighbours already
have (`@media (prefers-reduced-motion: reduce) { … animation: none; }`) — see
`StreamText.svelte` and `ToolCall.svelte` for the shape.

| # | source name | what it animates | ripple name | owner (lane) |
|---|---|---|---|---|
| 1 | `shimmer-text` | `background-position` 150% → -50%, drives a masked gradient across text | **already exists** as `ripple-reasoning-sweep` (ReasoningTrace) and `ripple-shimmer-sweep` (premium/Shimmer) | reuse — ReasoningTrace (B), Shimmer (A) |
| 2 | `fade-up` | opacity 0→1 + `translateY(8px)`→0; the staggered list entry | `ripple-tool-fade-up`, `ripple-stream-fade-up`, `ripple-reasoning-fade-up`, `ripple-approval-fade-up`, `ripple-task-fade-up` | **all four AI widgets** (B) — ToolCall, StreamText, ReasoningTrace (`ThinkingState.tsx:213,251`), ApprovalGate (`ApprovalCard.tsx:278`) — and TaskRows (C) |
| 3 | `records-pulse` | opacity .35/scale .8 ↔ opacity 1/scale 1, 1.1s infinite | — | **no owner this arc.** Only RecordsTable and AgentScreen use it, and neither is ported. Do not add. |
| 4 | `fade-in` | opacity 0→1 | `ripple-tool-fade-in`, `ripple-stream-fade-in`, `ripple-reasoning-fade-in`, `ripple-task-fade-in` | ToolCall, StreamText, ReasoningTrace (`ThinkingState.tsx:180,291`) — all B — and TaskRows (C) |
| 5 | `eq-bounce` | `scaleY` .35 ↔ 1 — the audio-equalizer bars | `ripple-prompt-eq-bounce` | PromptBar (C) — its only call site in the source |
| 6 | `caret-blink` | opacity 1 ↔ 0, `step-end` — the streaming caret | **already exists** as `ripple-stream-blink` (StreamText.svelte) | reuse — StreamText (B). Do not add. |
| 7 | `pop-in` | opacity 0 + `scale(.95)` → 1 | `ripple-tool-pop-in`, `ripple-stream-pop-in`, `ripple-approval-pop-in`, `ripple-task-pop-in` | ToolCall, StreamText, ApprovalGate (`ApprovalCard.tsx:260`) — all B — and TaskRows (C) |
| 8 | `spin` | `rotate(360deg)` | **already exists** 4× (`ripple-tool-spin`, `rcheck-spin`, `rdash-spin`, `c4-spin`) — and Tailwind ships `animate-spin`, which `display/Loading.svelte` already uses | use `animate-spin` — TaskRows' ring (C) and ReasoningTrace's small ring (`ThinkingState.tsx:231`, B). Do not add a 5th copy. |
| 9 | `pixel-on` | opacity .15 → 1 → .15, staggered per grid cell | — | **no owner this arc.** Only `LoadingState.tsx` uses it and it is not ported. Do not add. |

Net: **3 already exist** (reuse), **2 have no owner** (do not port), **4 to
paste** (`fade-up`, `fade-in`, `pop-in`, `eq-bounce`).

Durations and delays copy across as written — they are inline `animation`
shorthand in the source and become the same shorthand in the scoped block, with
`cubic-bezier(0.23,1,0.32,1)` swapped for `var(--ripple-ease-out)` per §3.

---

## 5. What we drop

- **`--page`, `--canvas`, `--stripe`, `--stripe-bg`.** The source paints the
  document with a fixed 45° repeating-linear-gradient stripe. Ripple components
  are embedded in a host's page; the host owns the ground. Components must not
  paint a page background.
- **Every `box-shadow` stack** — `--shadow-hairline`, `--shadow-btn`,
  `--shadow-card`, `--shadow-raised`, `--shadow-overlay`,
  `--shadow-inset-field`. Ripple Card measured zero shadow, and a shadow on
  glass reads as dirt. Where the source uses `shadow-card` to separate a surface,
  use `ring-1 ring-ripple-border`. **Elevation and shadow are a later, smaller
  pass — not this arc.**
- **The `.dark` block.** The host supplies the theme; ripple's tokens already
  cascade from the host's shadcn variables, so dark mode arrives for free and a
  second `.dark` block would fight it.
- **The opaque `--surface`.** Glass is decided. `bg-ripple-surface` resolves to
  the host's `--card`, whatever that is.
- **`--font-inter` / `--font-mono-face`.** The host owns typography. Use
  `font-mono` where the source does; never load a font.
- **`glimm`** (PromptBar's WebGL sweep on model change) — a WebGL dependency for
  a decorative accent is not a trade this pilot makes. Lane C builds PromptBar
  without it and notes the omission.

Also not ported at all, per the brief: `SidebarNav` (paid
`@central-icons-react`), `InsightCards` (React-only `liveline` charts — ripple
has `data/Chart.svelte`), `RecordsTable` (1,052 lines — ripple has
`data/Table.svelte` with edit + link tests).

---

## 6. Decision — TaskRows is genuinely new *(lane C was blocked on this)*

**Verdict: new. Not a re-skin of any existing ripple widget.** It lands as a
`./ui`-only component — see "where it lands" below.

`components/primitives/TaskRows.tsx` (274 lines) takes
`variant, rows, labels, className, onToggleRow`, where a row is
`{key, label, amount, status: 'done'|'running'|'sequence', step?, details: {label, meta}[]}`.
Behaviour: read-only status rows driven by a scripted tick, each with a
status badge (spinner ring / check / ✗), a right-aligned meta string, a status
pill, and an expand/collapse region revealing detail sub-lines. It mutates
nothing; `onToggleRow(key, open)` is a **disclosure** event, not a data edit.

Judged on prop and behaviour shape, not name, against four candidates — the two
the brief named, plus the two that are actually closest semantically:

| candidate | shape | why not |
|---|---|---|
| `interactive/TodoList.svelte` | `title, placeholder, items, value, onchange` — add / toggle / delete / filter | Its contract is a **mutation bind surface**: `value` + `onchange` emitting a whole new array so a spec can `bind: "state.tasks"`. TaskRows has no bound value and no mutation. Re-skinning would mean deleting the bind contract — forbidden by the arc's "props untouched" rule. |
| `display/Steps.svelte` | `steps: {title, description, number}[], orientation` | A static ordinal progression. No per-row status, no meta column, no expansion. Re-skinning would mean **adding** four props and a state machine. |
| `composite/ChecklistLayout.svelte` | `items: {id, label, description?, state: pending\|in-progress\|done\|blocked\|skipped, owner?, …}, value, onchange, groupBy, showProgress, ontoggle, onitemclick` | **The closest semantic match** — per-row status with a spinner (`rcheck-spin`) and a meta slot; `status` maps cleanly onto `state` (done→done, running→in-progress, sequence→pending). But it is a 500-line bound, mutating composite with grouping, progress and blocked-gating, and it has **no expand/collapse region at all**. Same objection as TodoList: the re-skin would have to delete its bind surface. |
| `composite/OrderStatus.svelte` | `orderId, status, steps, eta, tracking, origin, destination, route, showMap, …` | Order-tracking domain — map, ETA, tracking number. Not a match. |

So: new. **But the anti-duplication rule still binds.** ChecklistLayout remains
the answer for a bound, mutable, spec-driven checklist. TaskRows is the
read-only compact display and **must not grow a `value`/`onchange` bind
surface** — the moment it does, it is a worse ChecklistLayout.

**Where it lands** — checked against the repo's own guards, not assumed:

The file goes under `src/lib/widgets/` and is re-exported from
`src/lib/ui/index.ts`, with **no entry in the spec registry
(`widgets/index.ts`) and no manifest entry file under
`src/lib/manifest/entries/`**. Same rule for PromptBar.

**It must not live in `src/lib/ui/` itself**, tempting as that looks — two
assertions in `ui-contract.test.ts` would fail:

- it counts imports matching `from '(\.\.\/[^']+\.svelte)'` and asserts that
  count equals the number of component exports, so a sibling import
  (`'./TaskRows.svelte'`) does not match and leaves the count one short;
- it then looks each path up in a glob of `../widgets/**/*.svelte` and
  `../components/ui/**/*.svelte`, so a file outside those two trees fails
  `source not found for …`.

Avoid `widgets/premium/` specifically — `premium.test.ts` globs `./*.svelte`
in that directory and applies pack-specific rules.

Nothing pulls the other way. `manifest.test.ts`'s only cross-check is
manifest entry → registry type (the "no ghosts" test); there is **no** reverse
assertion that every `widgets/**/*.svelte` has a registry or manifest entry, and
`getWidgetTypes()` reads the registry rather than scanning the filesystem. So an
unregistered component under `widgets/` passes every gate, which is what keeps
the arc's proof — **189 widgets, unchanged shapes** — true while lanes A/B/C add
components. Making either component spec-drivable later is a deliberate
follow-up that bumps the count on purpose.

---

## 7. Decision — StatusPill is a re-skin of Badge *(lane A was blocked on this)*

**Verdict: re-skin `display/Badge.svelte`. Not a new atom, not a StatusDot
re-skin. Drop the dot.**

`components/atoms/StatusPill.tsx` (48 lines) is
`tone: green|orange|red|accent|neutral`, `children`, `dot = true`, `className` —
a `rounded-full` pill, tinted background, coloured text, optional leading dot.

The tint-on-tone pattern **is already Badge's**: Badge maps
`success → bg-ripple-success/10 text-ripple-success border-ripple-success/20`,
and the source's `--green-tint` is just `--green` at 14% alpha. Same idea, same
tokens. Badge also already renders `rounded-4xl` at `h-5`, which is the pill
geometry. StatusDot is the wrong parent: it is a dot with an optional trailing
label, not a filled pill, and its variants are presence states
(`online|offline|busy|away`), not statuses.

Tone mapping for lane A — `tone` becomes `variant`, no new prop:

| StatusPill `tone` | Badge `variant` |
|---|---|
| `green` | `success` |
| `orange` | `warning` |
| `red` | `destructive` |
| `accent` | `default` |
| `neutral` | `secondary` |

One consequence to go in with eyes open: `default` and `secondary` are
**solid-fill** variants today, while StatusPill's `accent` and `neutral` are
tints like the rest. Re-skinning Badge therefore changes how every existing
spec's default Badge looks. That is the intended effect of a re-skin, not a
mismatch to paper over by adding two more variants.

**The dot is dropped.** Badge's props are recorded verbatim in
`static/manifest.json`, so an additive `dot` prop is a manifest shape change,
and the arc's proof is unchanged shapes. The source itself calls the dot
optional and the pills inside TaskRows use no dot. If it turns out to be
load-bearing visually, it is a follow-up prop after the arc lands, not a
lane-A decision.

**Two gaps lane A should see but not fix in this lane:**

- Badge has **no `error` or `info` variant** even though ripple publishes
  `--color-ripple-error` and `--color-ripple-info`. `destructive` routes to
  shadcn's `--destructive`, not `ripple-error`, so a "red" pill in a
  ripple-rethemed host will not match `success`/`warning`, which do use ripple
  tokens. Real inconsistency, pre-existing, and adding a variant is a manifest
  shape change. Flag it; do not fix it here.
- `display/StatusDot.svelte` hard-codes hex colours (`#10b981`, `#ef4444`,
  `#f59e0b`, `#9ca3af`) instead of ripple tokens — drift that predates this arc
  and is out of scope for it.

One more thing lane A will trip over: `ui-contract.test.ts` passes
`StatusDot: { status: 'success' }`, but StatusDot's prop is `variant`, not
`status`. The test still passes because the component defaults, so it proves
less than it looks like it proves. Pre-existing; note it, leave it.

---

## 8. Conventions a lane must not rediscover

- **`tailwind-variants` (`tv()`)**, never `cva`. The source's atoms use `cva` —
  translate. `badge.svelte` is the local example.
- **`cn` is `twMerge(clsx(…))`** as of ripple #122, so a caller's class
  correctly beats a base class. No regex workarounds.
- **State variants are written out** — `data-[state=open]:`, never the
  `data-open:` shorthand. The shorthand only resolves inside ripple's own build
  (`src/lib/styles.css`); in a consumer's build it compiles to `[data-open]`,
  which bits-ui never emits, and the rule is silently dead.
  `ui-contract.test.ts` enforces this across every packaged `.svelte` file.
- **`lint:anim`** forbids top-level `motion` imports. The skin is tier 0 — CSS
  only, no motion.dev.
- **React → Svelte 5:** `useState`→`$state`, `useEffect`→`$effect`,
  `useLayoutEffect`→`$effect.pre` or `bind:clientHeight`, `useRef`→`bind:this`,
  `createPortal`→ the overlay canonical (`Tooltip`/`HoverCard` from `./ui`).
- **Provenance header on every re-skinned file:**
  `origin: slev12397/beautiful-ui@ff0f74d components/primitives/ThinkingState.tsx`
- The source's pilot components are Tailwind-utility styled, but others in that
  repo use semantic CSS classes in `globals.css`. If a lane hits one, translate
  it to utilities rather than copying a CSS block into a repo that has none.

---

## 9. Proof the ease token compiles

The failure this guards against is silent: a token in the wrong place produces a
class that compiles to nothing, with no error anywhere. Run against Tailwind
v4's compiler with the exact shape shipped in `theme.css`:

```
.ease-ripple-out {
  --tw-ease: var(--ripple-ease-out);
  transition-timing-function: var(--ripple-ease-out);
}
```

and `ease-bogus-token` in the same candidate list emitted **nothing**, which is
what makes the positive result mean something. `bg-ripple-surface` in the same
run emitted `background-color: var(--ripple-surface)` — same mechanism, so the
ease token is host-overridable exactly like the colours.

The proof is one-shot (the command and its output are in the lane F status
file). A durable compile guard in `bun run test` is a sensible follow-up but
needs Tailwind's `@import "tailwindcss"` resolved inside vitest, which the
repo's tsconfig (no node types) makes fiddly — not worth blocking three lanes
for.
