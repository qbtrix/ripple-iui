# Ripple Atoms Roadmap

**Date:** 2026-04-15
**Status:** Living doc — update as widgets land.
**Purpose:** Sequence the widget-rebuild work so every plan follows the same recipe. Avoids rewriting the boilerplate per widget.

---

## The recipe (applies to every atom plan)

1. **Failing tests** — behavior only, not visuals. `data-variant` / `data-size` / `data-slot` / `role` / `aria-*` / event firing / prop → DOM mapping.
2. **Rebuild the widget** — drop shadcn `components/ui/<widget>` wrapper layer, compose `bits-ui` primitive directly, `tailwind-variants` recipe as single source of visual truth.
3. **Register** — ensure the widget is in `widgets/index.ts` registry and `widget-types.ts` enum (most already are — check).
4. **Showcase** — add to `/showcase/<widget>/` with all variants, states, sizes, slot combinations.
5. **Doc + verify** — update this roadmap's status table, run `bun run check` + `bun run test --run` green.

No new dependencies beyond what's already in `package.json` (`bits-ui`, `tailwind-variants`, `@lucide/svelte`, `runed`).

## Shared conventions

- **Densities:** `compact` | `comfortable`. Compact default (matches Card).
- **Sizes:** `sm` | `md` | `lg`. `md` default. `md` padding/font matches Card compact density.
- **Variants:** `default` is always the neutral/most-common. Semantic colors (`destructive`, `success`, `warning`, `info`) only when they genuinely communicate meaning.
- **State data-attrs:** `data-variant`, `data-size`, `data-state` — for styling hooks and test assertions.
- **A11y:** all interactive widgets get `role`, `tabindex`, keyboard activation, `aria-disabled` / `aria-invalid` / `aria-busy` as needed.
- **Events:** Svelte-style `onclick`, `onchange`, `oninput`. Not kebab-case. Event-dispatcher-compatible.
- **Slot naming:** `header`, `footer`, `leading` (icon/prefix), `trailing` (icon/suffix), `children` (default body).
- **Loading/busy:** widgets that fire async actions take `loading?: boolean` and render a spinner in-place, disable interaction, set `aria-busy`.

## Widget sequence + status

| Order | Widget | Plan | Status | Why this position |
|---|---|---|---|---|
| 0 | **Card** | `2026-04-14-card-widget-rebuild.md` | ✅ done | Container for everything else |
| 0 | **Stat** | `2026-04-15-stat-widget.md` | ✅ done | KPI pattern (replaces Metric) |
| 0 | **JSON slots + stat registry** | `2026-04-15-json-schema-slots.md` | ✅ done | Unblocks agent-authored pockets |
| 1 | **Button** | `2026-04-15-button-rebuild.md` | ✅ done | Every action surface. Highest frequency. |
| 2 | **Input** | TBD | 🟡 next | Every form field |
| 3 | **Badge** | TBD | ⏳ | Used by Stat, Feed, Table — visual vocabulary |
| 4 | **Tabs** | TBD | ⏳ | Pocket navigation |
| 5 | **Avatar** | TBD | ⏳ | Pairs with Feed |
| 6 | **Feed** | TBD | ⏳ | Activity stream — needs Avatar first |
| 7 | **Progress** | TBD | ⏳ | Loading patterns |
| — | Typography + oklch tokens | TBD | ⏳ | Insert between 3 and 4 if color drift is bothering us |
| 8+ | Table | TBD | ⏳ | Own multi-task plan — big scope |

## AI-native display tier (2026-06-24)

Added a new `ai` manifest category — the read-only widgets a generative-UI engine
renders to show an *agent's* work, which the catalog lacked. All display-only
(render from props/bound state; no write-back).

| Widget | Type | Tier | What it shows |
|---|---|---|---|
| **StreamText** | `stream-text` (+ `streaming-text`) | atom | Progressive/streaming text — live-stream a growing state path or typewriter a static string. aria-live + blinking caret, reduced-motion safe. Reuses Markdown when `markdown`. |
| **ToolCall** | `tool-call` (+ `tool-invocation`) | organism | Agent tool-invocation card — name + icon, status badge (pending/running/success/error), collapsible args (JSON) + result. Collapsed on success, auto-expanded on error. |
| **ReasoningTrace** | `reasoning-trace` (+ `reasoning`, `thinking-trace`) | organism | Agent reasoning steps — collapsed "Reasoned for N steps", expands to an ordered list; active step shimmers; reduced-motion safe. |

Files: `src/lib/widgets/ai/`, manifest entries in `src/lib/manifest/entries/{stream-text,tool-call,reasoning-trace}.ts`, category pin in `src/lib/manifest/ai-category.test.ts`, behavior tests in `src/lib/widgets/ai/ai.test.ts`, showcase at `/showcase/ai`.

## Not in scope (explicit skips)

- **Container / Flex / Grid** — layout primitives, no shadcn baggage. Fine as-is.
- **Select / Checkbox / Switch** — bits-ui already drives behavior; shadcn visual is unobtrusive. Cosmetic pass later if needed.
- **Text / Heading / Image** — trivial; a typography token pass covers these for free.
- **GlassCard / Dashboard / DashboardSlot** — niche. Revisit after the core atoms land.
- **Terminal / SoulStatus / research/*** / c4 / workflow** — specialized. Not pocket-common.
- **Metric deletion** — keep until call-sites migrate to `Stat`.

## Success criterion

After Button + Input + Badge land, a typical pocket built by an agent (Card with title, description, Stat header, form-style body with labeled Input, action Buttons, status Badges) should feel production-quality — not "AI-generated."
