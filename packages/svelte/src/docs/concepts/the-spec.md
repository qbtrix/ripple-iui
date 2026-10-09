---
title: The spec
description: The two spec formats Ripple renders, every field on a node, and how to validate a spec before you mount it.
order: 1
---

A spec is the JSON a model writes and Ripple renders. Ripple reads two formats:

- **UISpec** (version `1.0`): an explicit tree of widgets. You decide every node.
- **UniversalSpec** (version `2.0`): a declaration of what the UI is for (`browse`, `form`, `detail` and so on). Ripple picks a designed layout for it, and you can still drop down to a raw tree.

Both go to the same `<Ripple spec={...} />`. Internally a UISpec is treated as a UniversalSpec with `intent: 'custom'`, which renders its `ui` tree as written.

## UISpec

```ts
interface UISpec {
  version?: string;               // '1.0' by default
  state?: Record<string, any>;    // initial state
  sources?: Record<string, any>;  // server-side read bindings, passed through untouched
  ui: UINode;                     // the root of the widget tree (required)
  theme?: ThemeOverrides;         // colours, radius, fonts
  meta?: { title?: string; description?: string };
}
```

The tree field is called `ui` exactly. A spec that names it `root`, `tree`, `view`, `body` or `content` renders nothing.

### Versioning

Any version in the 1.x line parses. A newer minor such as `1.1` is additive by contract, so it renders and unknown fields are ignored. A different major such as `2.0` on a UISpec is refused with a parse error instead of being drawn wrong. A patch digit (`1.0.0`) is tolerated. To check ahead of a mount, call `isCompatibleUISpecVersion(version)`.

### sources

`sources` holds read bindings that your server owns and runs. Ripple never executes them. It keeps the key as written, so a spec that goes through parse, render and serialize comes back with its `sources` intact. The shape of each entry is up to the server that reads it. There is no client-side fetch field in the spec; remote data comes through `sources`, through your `onEvent` handler, or through the `state` you pass in.

## UINode

Every node in the tree has this shape:

```ts
interface UINode {
  type: string;                    // a widget from the catalog, or 'if' / 'each'
  id?: string;                     // stable id, used by `invoke` and editors
  props?: Record<string, any>;     // the widget's own props
  children?: UINode[];
  bind?: string;                   // two-way binding to a state path
  show?: string;                   // render only when this is truthy
  class?: string;
  style?: Record<string, string>;
  motion?: Motion;                 // declarative animation
  slot?: string;                   // which named slot of the parent to fill

  // events: one handler or an array that runs in order
  on_click?: EventHandler | EventHandler[];
  on_change?: EventHandler | EventHandler[];
  on_input?: EventHandler | EventHandler[];
  on_submit?: EventHandler | EventHandler[];
  on_focus?: EventHandler | EventHandler[];
  on_blur?: EventHandler | EventHandler[];

  // for 'each'
  items?: string;                  // the array to loop over
  item_as?: string;                // loop variable name, default 'item'
  index_as?: string;               // index variable name, default 'index'

  // for 'if'
  condition?: string;
  else_children?: UINode[];
}
```

Widgets can also take their own `on_*` events, such as `on_complete` on a timer. The widget reference lists them. See [Actions and events](/docs/concepts/actions-and-events).

### Control flow: if and each

`if` renders `children` when `condition` is truthy and `else_children` otherwise. `each` repeats its children once per item, with the item and index in scope under the names you choose:

```ripple
{
  "version": "1.0",
  "state": {
    "showDone": true,
    "tasks": [
      { "title": "Write the brief", "done": true },
      { "title": "Review the draft", "done": false }
    ]
  },
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": "8px" },
    "children": [
      { "type": "switch", "bind": "showDone", "props": { "label": "Show finished tasks" } },
      {
        "type": "each",
        "items": "{state.tasks}",
        "item_as": "task",
        "children": [
          {
            "type": "if",
            "condition": "{!task.done || state.showDone}",
            "children": [
              { "type": "text", "props": { "text": "{task.done ? 'Done' : 'To do'}: {task.title}" } }
            ]
          }
        ]
      }
    ]
  }
}
```

`each` reads `items` from state or from the data you pass in, not from an outer loop variable. A nested `each` over `{group.members}` renders nothing.

### slot

`slot` sends a child to a named slot on its parent, for example the `header` or `footer` of a `card`. A child with no `slot`, or with a slot the parent doesn't have, goes in the default position.

```ripple
{
  "version": "1.0",
  "ui": {
    "type": "card",
    "children": [
      { "type": "heading", "slot": "header", "props": { "text": "Weekly report", "level": 3 } },
      { "type": "text", "props": { "text": "Orders are up 12% on last week." } },
      { "type": "button", "slot": "footer", "props": { "label": "Open report" } }
    ]
  }
}
```

### motion

`motion` sits on the node, next to `class` and `style`, not inside `props`. It describes an animation by intent: enter and exit states, hover, tap and focus states, scroll-linked transforms, in-view triggers and stagger. Only GPU-friendly channels can be animated, so a spec can't animate `width`, `top` or `margin`.

```json
{
  "type": "card",
  "motion": {
    "enter": { "opacity": 0, "y": 12 },
    "transition": { "preset": "smooth", "delay": 0.12 }
  }
}
```

`transition.delay` is in seconds and `duration` is in milliseconds.

### theme

The optional `theme` block sets colours, radius and fonts for one render:

```ts
interface ThemeOverrides {
  colors?: Record<string, string>;   // background, primary, card, chart-1 ... (see Theming)
  radius?: string;                   // e.g. '0.5rem'
  mode?: 'light' | 'dark' | 'system';
  fonts?: { sans?: string; serif?: string; mono?: string; heading?: string };
  logo?: { src: string; alt?: string; darkSrc?: string };
}
```

The token list and how the values reach the page are in [Theming](/docs/guides/theming).

## UniversalSpec

A UniversalSpec says what the UI is for and hands Ripple the data. Ripple picks a layout:

```ts
interface UniversalSpec {
  version: '2.0';
  intent: IntentType;               // what the UI should do
  id?: string;
  title?: string;
  description?: string;
  theme?: ThemeOverrides;
  lifecycle?: { type: 'ephemeral' | 'tool' | 'persistent'; id?: string; icon?: string; label?: string };

  data?: Record<string, any>;       // inline data
  sources?: Record<string, any>;    // server-side read bindings, passed through
  fields?: Record<string, string>;  // semantic role -> field name in your data
  display?: DisplayHints;
  selection?: 'single' | 'multiple' | 'none';

  ui?: UINode;                      // raw tree, used by intent 'custom'

  on_select?: any;
  on_complete?: any;

  // multi-step flows
  flowId?: string;
  chain?: UniversalSpec;
  chain_map?: Record<string, UniversalSpec>;
  onComplete?: FlowAction;
}
```

Nine intents render through a designed layout: `form`, `confirm`, `quick_confirm`, `browse`, `select`, `detail`, `info`, `search` and `slides`. `dashboard` has its own renderer. Every other intent, including `custom`, `action` and `workspace`, renders the `ui` tree as written. `intent: 'custom'` plus a `ui` tree is how you get full control back when no designed layout fits.

`fields` tells the layout which of your data fields plays which role:

```json
{
  "fields": { "title": "name", "image": "thumbnail_url", "description": "summary", "price": "cost", "id": "product_id" }
}
```

`display` nudges the layout without replacing it:

```ts
interface DisplayHints {
  layout: 'auto' | 'grid' | 'list' | 'masonry' | 'carousel' | 'hero' | 'split'
        | 'comparison' | 'checklist' | 'invoice' | 'report' | 'timeline' | 'table' | 'article';
  columns?: number;
  density: 'compact' | 'comfortable' | 'spacious';
  item_template?: UINode;
}
```

The last seven layout values (`comparison` to `article`) route a spec to a designed composite layout. For example, `intent: 'info'` with `display.layout: 'invoice'` renders the invoice layout.

Multi-step flows (`chain`, `chain_map`, `flowId`, `onComplete`) are covered in [Intents](/docs/guides/intents).

## Validate before you mount

The schemas are Zod schemas, exported with parse helpers:

```ts
import { parseUISpec, safeParseUISpec, parseUniversalSpec, safeParseUniversalSpec } from '@ripple-ui/svelte';

const spec = parseUISpec(input);            // throws a ZodError when invalid

const result = safeParseUISpec(input);      // never throws
if (result.success) render(result.data);
else console.error(result.error.issues);
```

The schema checks the shape of the spec, not whether each `type` is a real widget. For that, use `validateCatalog` from `@ripple-ui/svelte`, which returns every node whose `type` isn't a registered widget. See the [@ripple-ui/svelte reference](/docs/api/svelte#validatecatalog).

## Editing a spec in place

A spec doesn't have to be regenerated whole to change. Ripple ships a small set of edit operations keyed by node `id`, which an editor or an agent can apply one at a time: `applySetNodeProp`, `applyAddNode`, `applyReplaceNode`, `applyRemoveNode`, `applyMoveNode`, `applySetPropArrayItem`, `applyAppendPropArrayItem` and `applyRemovePropArrayItem`, with `applyOp` to apply any of them from a plain object. `ensureNodeIds(spec)` fills in missing ids first. All of them are exported from `@ripple-ui/core` and `@ripple-ui/svelte`.
