<!--
  docs/ui-spec.md — UISpec v1.0 human-readable reference.
  Changes:
    - 2026-07-01: synced to the Zod source of truth. Added the source-of-truth
      banner; documented the `sources` top-level key (RFC 04), node-level
      `motion` (RFC 12), the `slot` field on UINode, and the `fonts` + `logo`
      token groups on ThemeOverrides. Added an "Editing (SpecOp)" note.
    - 2026-07-14: forgiving versioning (same-major renders, different major
      refused) with a Versioning section; removed the dead `data`/DataFetcher
      docs — the field never executed and is gone from the schema.
-->

> **Source of truth:** the Zod schemas in `src/lib/schema/ui-spec.ts` and `src/lib/schema/universal-spec.ts` are canonical. This doc is a human-readable companion and may lag the code — when they disagree, the schema wins. Last verified against code: 2026-07-01.

# UISpec Reference (v1.0)

The UISpec is the low-level specification format for Ripple. It gives you full control over the widget tree, layout, and interactions.

## Top-Level Structure

```typescript
interface UISpec {
  version?: string;                            // Schema version (default '1.0') — see Versioning below
  state?: Record<string, any>;                 // Initial state values
  sources?: Record<string, any>;               // Server-executed read bindings (RFC 04) — see below
  ui: UINode;                                  // The root widget tree (required)
  theme?: ThemeOverrides;                      // Color/appearance overrides
  meta?: { title?: string; description?: string };
}
```

### Versioning

Any version in the renderer's major line parses: a newer **minor** (`1.1`,
`1.99`) is additive by contract, so it renders and unknown fields are ignored;
a different **major** (`2.0`) is refused with a clear parse error rather than
mis-rendered. A semver-style patch digit (`1.0.0`) is tolerated. Hosts can
check ahead of a mount with `isCompatibleUISpecVersion(version)` (Gen-1
`UISpec` only — `UniversalSpec` is versioned separately).

> **Removed:** the `data` field (client-side `DataFetcher` blocks). It was
> never executed — a declared fetcher silently resolved to nothing. Use
> `sources` (server-executed, RFC 04) for remote data; parsing strips a legacy
> `data` block and the renderer logs a one-time console warning.

### `sources` — server-executed read bindings (RFC 04)

`sources` carries read bindings that the **server** owns and executes; Ripple never runs them. It preserves the key verbatim as an opaque pass-through, so a client round-trip (parse → render → re-serialize) cannot silently drop it. The shape of each entry is defined by the server that consumes it, which is why the schema types it as `Record<string, any>` rather than a fixed contract. If you are authoring specs for a host that resolves `sources` server-side (e.g. dynamic Paw Sites), put your read bindings here; there is no client-side fetch path in the spec (the removed `data` fetchers never executed).

```json
```

## UINode

Every node in the widget tree is a `UINode`:

```typescript
interface UINode {
  type: string;                                // Widget type (e.g. 'flex', 'button', 'text')
  id?: string;                                 // Unique identifier
  props?: Record<string, any>;                 // Widget-specific properties
  children?: UINode[];                         // Child nodes
  bind?: string;                               // Two-way state binding (e.g. '{state.name}')
  show?: string;                               // Conditional visibility expression
  class?: string;                              // CSS class names
  style?: Record<string, string>;              // Inline CSS styles
  motion?: Motion;                             // Declarative animation (RFC 12) — sibling to class/style, NOT inside props
  slot?: string;                               // Named snippet slot to route this child into on its parent (e.g. 'header'/'footer' on a Card)

  // Event handlers (single or array for chaining)
  on_click?: EventHandler | EventHandler[];
  on_change?: EventHandler | EventHandler[];
  on_submit?: EventHandler | EventHandler[];
  on_focus?: EventHandler | EventHandler[];
  on_blur?: EventHandler | EventHandler[];

  // Control flow (for 'each' widget)
  items?: string;                              // Data source path
  item_as?: string;                            // Loop variable name (default: 'item')
  index_as?: string;                           // Index variable name (default: 'index')

  // Control flow (for 'if' widget)
  condition?: string;                          // Boolean expression
  else_children?: UINode[];                    // Rendered when condition is false
}
```

The event handlers on a node are `on_click`, `on_change`, `on_input`, `on_submit`, `on_focus`, and `on_blur`. Each accepts a single `EventHandler` or an array of them (arrays chain in order).

### `motion` — declarative animation (RFC 12)

`motion` is a **node-level** field (a sibling of `class` and `style`, **not** a key inside `props`). It describes an animation by intent — enter/exit/hover/tap/focus states, scroll-linked transforms, in-view triggers, and stagger — using a closed, GPU-safe channel set so layout-thrashing properties (width/top/margin) can't be expressed. The full field schema lives in `src/lib/schema/motion.ts`.

```json
{
  "type": "card",
  "motion": {
    "enter": { "opacity": 0, "y": 12 },
    "transition": { "preset": "smooth", "delay": 0.12 }
  }
}
```

Note: `transition.delay` is in **seconds** (Framer/motion.dev convention), while `duration` is in ms. See the header of `motion.ts` for the rationale.

### `slot` — named snippet routing

`slot` names a snippet slot on the **parent** widget to route this child into (for example `'header'` or `'footer'` on a `Card`). A child without a `slot`, or one naming a slot the parent doesn't expose, renders in the default child position.

```json
{
  "type": "card",
  "children": [
    { "type": "heading", "slot": "header", "props": { "text": "Title" } },
    { "type": "text", "props": { "text": "Body content" } },
    { "type": "button", "slot": "footer", "props": { "label": "Save" } }
  ]
}
```

## Complete Example

```json
{
  "version": "1.0",
  "state": {
    "selectedTab": "overview",
    "searchQuery": "",
    "items": [
      { "name": "Alpha", "status": "active", "value": 42 },
      { "name": "Beta", "status": "pending", "value": 17 }
    ]
  },
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": 4 },
    "children": [
      {
        "type": "heading",
        "props": { "text": "Dashboard", "level": 1 }
      },
      {
        "type": "input",
        "props": { "placeholder": "Search...", "label": "Search" },
        "bind": "{state.searchQuery}",
        "on_change": { "action": "set", "target": "searchQuery" }
      },
      {
        "type": "tabs",
        "props": {
          "tabs": [
            { "value": "overview", "label": "Overview" },
            { "value": "details", "label": "Details" }
          ]
        },
        "bind": "{state.selectedTab}",
        "on_change": { "action": "set", "target": "selectedTab" },
        "children": [
          {
            "type": "table",
            "props": {
              "data": "{state.items}",
              "columns": [
                { "header": "Name", "accessorKey": "name" },
                { "header": "Status", "accessorKey": "status" },
                { "header": "Value", "accessorKey": "value" }
              ]
            }
          }
        ]
      },
      {
        "type": "if",
        "condition": "{state.searchQuery != ''}",
        "children": [
          {
            "type": "text",
            "props": { "text": "Searching for: {state.searchQuery}", "size": "sm" }
          }
        ],
        "else_children": [
          {
            "type": "text",
            "props": { "text": "Type to search", "size": "sm", "color": "#888" }
          }
        ]
      }
    ]
  },
  "theme": {
    "colors": {
      "primary": "#3b82f6"
    },
    "mode": "dark"
  }
}
```

## ThemeOverrides

The optional `theme` block customizes appearance. Its full shape:

```typescript
interface ThemeOverrides {
  colors?: {                                   // Semantic color overrides (Hex or OKLCH)
    background?: string; foreground?: string;
    card?: string; 'card-foreground'?: string;
    popover?: string; 'popover-foreground'?: string;
    primary?: string; 'primary-foreground'?: string;
    secondary?: string; 'secondary-foreground'?: string;
    muted?: string; 'muted-foreground'?: string;
    accent?: string; 'accent-foreground'?: string;
    destructive?: string; 'destructive-foreground'?: string;
    border?: string; input?: string; ring?: string;
    'chart-1'?: string; /* ... through */ 'chart-5'?: string;
    sidebar?: string; /* ...plus the sidebar-* token family */
  };
  radius?: string;                             // Border radius (e.g. "0.5rem")
  mode?: 'light' | 'dark' | 'system';          // Dark-mode preference
  fonts?: {                                    // Font-family tokens → CSS vars (--ripple-font-*)
    sans?: string; serif?: string; mono?: string; heading?: string;
  };
  logo?: {                                     // Brand logo → surfaced to widgets (e.g. Navbar), emitted as --ripple-logo*
    src: string;                               // required
    alt?: string;
    darkSrc?: string;                          // optional dark-mode variant
  };
}
```

`fonts` and `logo` support white-label theming (RFC 12): `fonts` emits `--ripple-font-*` CSS variables and `logo` is surfaced to widgets such as `Navbar` and emitted as `--ripple-logo*`. `logo.src` is the only required field inside the `logo` group.

## Editing (SpecOp)

Ripple specs are not only generated whole — they are also **edited in place**. Both the visual editor and the authoring agent mutate a spec by emitting a small, closed op vocabulary keyed by stable node IDs, rather than re-emitting the whole tree:

- `set_node_prop` — set/replace a single prop on a node
- `add_node` — insert a new subtree under a parent (append, or after a sibling)
- `replace_node` — swap a node's subtree wholesale
- `remove_node` — delete a node
- `move_node` — reparent/reorder a node
- `set_prop_array_item` — set one item inside an array-valued prop

This op vocabulary is introduced by the Ripple Unified Design Module (see the workspace PRD). The in-tree mutation engine that applies these edits lives in `src/lib/core/spec-mutator.ts`, whose wire payloads use the past-tense action names (`node_added`, `node_prop_set`, ...); the op names above are the author-facing verbs.

## Validation

```typescript
import { parseUISpec, safeParseUISpec } from '@ripple-ui/svelte';

// Throws ZodError on invalid input
const spec = parseUISpec(jsonInput);

// Returns { success, data, error }
const result = safeParseUISpec(jsonInput);
if (result.success) {
  // result.data is a valid UISpec
}
```
