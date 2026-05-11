# Ripple themable tokens + chrome cleanup — design

Date: 2026-05-05

## Problem

When Ripple widgets render inside paw-enterprise, three things look wrong:

1. **Buttons feel dead.** Native `<button>` defaults to `cursor: default`, and the `default` button variant in `button.svelte` declares hover as `[a]:hover:bg-primary/80` — a selector that only fires on `<a>` elements. Plain buttons get no cursor change and no hover color.
2. **Some buttons render no color at all.** Suspected but not yet confirmed; investigated as a follow-up after Fix 1 lands.
3. **Decorative card chrome on widgets that aren't cards.** 16 widgets wrap themselves in `bg-card` (Quote, Steps, Tree, Kanban, Calendar, Sidebar, MasterDetail, AppShell, etc.). When rendered inside a chat bubble or a pocket pane that already has its own surface, this produces stacked-card-on-card visuals the host can't undo.

The host (paw-enterprise) needs a way to theme Ripple per render context — chat-inline should look transparent and seamless; pocket-pane should look like a proper surface — without forking the library or polluting shadcn's global tokens.

## Goals

- Single, host-controllable theme dial for Ripple, namespaced so it doesn't leak into the host's other UI.
- Zero behavior change if the host does nothing — Ripple keeps looking the way it does today by default.
- Decorative chrome that the host can't reach is removed; semantic chrome (Card, Alert) stays themable.
- Buttons feel like buttons.

## Non-goals

- Per-widget theme APIs / `chrome` props. Not adding more spec-author cognitive load.
- Reworking the spec schema. This is purely a styling and packaging change.
- Light/dark mode work. Existing shadcn light/dark cascade keeps working.

## Approach

### Ripple theme tokens

A small set of `--ripple-*` CSS custom properties, each defaulting to a shadcn equivalent. Widgets reference them via Tailwind utilities (`bg-ripple-surface`, `border-ripple-border`, `rounded-ripple`). The host overrides them in scoped CSS to retheme Ripple per render context.

Token set:

```css
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

### Shipping CSS to consumers

Today `ripple/src/lib/styles.css` is a dev-playground stylesheet — it's not part of the published package and not listed in `package.json` exports. Consumers can't import it.

We add a new file `ripple/src/lib/theme.css` containing only the `--ripple-*` defaults and the `@theme inline` block. svelte-package copies all of `src/lib/` into `dist/`, so the file lands at `dist/theme.css` automatically. We add an export entry so consumers do:

```css
@import "@ripple-ui/svelte/theme.css";
```

paw-enterprise imports it from `src/styles/global.css`.

### Host customization pattern

`Ripple.svelte` adds `data-ripple-root` to its root element. The host scopes overrides:

```css
.chat-bubble [data-ripple-root] {
  --ripple-surface: transparent;
  --ripple-border: transparent;
  --ripple-radius: 0;
}

.pocket-pane [data-ripple-root] {
  --ripple-surface: color-mix(in oklab, var(--card) 96%, var(--paw-accent));
  --ripple-radius: 0.75rem;
}
```

CSS custom properties cascade, so every widget under that root picks up the override automatically — no per-widget plumbing.

### Widget chrome cleanup (option A)

Three buckets:

| Bucket | Widgets | Action |
|---|---|---|
| **Semantic surface** | `components/ui/card/card.svelte`, `widgets/layout/Card.svelte`, `components/ui/alert/alert.svelte` | `bg-card` → `bg-ripple-surface`, `border-border` → `border-ripple-border`, `rounded-xl/lg` → `rounded-ripple`. Stay themable. |
| **Decorative chrome** | `display/Quote.svelte`, `display/Steps.svelte` (pip dots), `display/LinkPreview.svelte`, `display/Highlight.svelte`, `display/Diff.svelte`, `vertical/SettingsList.svelte`, `vertical/PricingTable.svelte`, `vertical/OrgChart.svelte`, `vertical/BulkActionBar.svelte`, `data/Tree.svelte`, `data/Kanban.svelte`, `data/Calendar.svelte`, `input/FileUpload.svelte` | Strip outer `bg-card`. Inner accents (Steps pip, FileUpload dropzone) move to `bg-ripple-muted/40` so they're still visible but transparent-ish. |
| **Layout chrome** | `layout/Sidebar.svelte`, `layout/MasterDetail.svelte`, `layout/AppShell.svelte` | Strip `bg-card` entirely — these are layout primitives, the host owns the surface. |

If a spec author wants chrome back on a stripped widget, they wrap the spec in a `Card` widget. Default = transparent; chrome = explicit.

### Button fixes

In `ripple/src/lib/components/ui/button/button.svelte`:

- Add `cursor-pointer` to base classes (line 7).
- Replace `[a]:hover:bg-primary/80` with `hover:bg-primary/90` in the default variant (line 10) so plain buttons hover too.
- Migrate variant colors: `bg-primary` → `bg-ripple-accent`, `text-primary-foreground` → `text-ripple-accent-foreground`, `border-border` → `border-ripple-border`, `bg-muted` → `bg-ripple-muted`, `bg-background` → `bg-ripple-surface`.

Once the cursor + hover land, verify in dev whether "buttons render no color" is still a real bug; if it is, investigate Tailwind dist scanning separately.

## Trade-offs

- **Token surface area**: 9 tokens. Could be smaller (just surface/border/radius) but accent + muted matter for buttons and subtle backgrounds. Could be larger (per-widget tokens) but YAGNI.
- **Breaking change**: yes. Any external consumer that relied on Ripple widgets having `bg-card` by default will see them go transparent. Internal consumer (paw-enterprise) is the only known one and is updated in the same PR.
- **Two stylesheets in dist**: `styles.css` (dev playground, unchanged) and the new `theme.css` (consumer-facing). The dev playground keeps its current theme imports; consumers only import `theme.css`.

## Out of scope

- Per-spec theming knobs in JSON. Theme is host-side via CSS only.
- Light-mode-specific tweaks beyond what shadcn already gives.
- Widget-by-widget audit beyond the 16 with `bg-card`. If `bg-muted` or `bg-background` appears in a widget where it shouldn't, that's a separate cleanup.
