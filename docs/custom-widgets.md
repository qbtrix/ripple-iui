# Custom Widgets

Ripple's widget registry is extensible — you can add your own widgets at runtime.

## Registering a Widget

```typescript
import { registerWidget } from '@ripple-ui/svelte';
import MyWidget from './MyWidget.svelte';

registerWidget('my-widget', MyWidget);
```

Now use it in specs:

```json
{
  "type": "my-widget",
  "props": { "title": "Custom!", "count": 42 }
}
```

## Writing a Widget

A Ripple widget is any Svelte 5 component. Props from the spec are spread onto the component.

```svelte
<!-- MyWidget.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    children?: Snippet;
    // Your custom props
    title?: string;
    count?: number;
    onclick?: () => void;
  }

  let { id, class: className, style, children, title, count = 0, onclick }: Props = $props();
</script>

<div {id} class={className} {onclick}>
  <h3>{title}</h3>
  <span>{count}</span>
  {@render children?.()}
</div>
```

### Key Points

1. **Accept `children` as a Snippet** — NodeRenderer passes children via Svelte 5 snippets
2. **Accept `class` and `style`** — NodeRenderer resolves and passes these
3. **Accept `onclick` / `onchange`** — NodeRenderer wraps event handlers into callbacks
4. **Props are resolved** — expression bindings like `{state.count}` are already resolved to values by the time they reach your widget

## Accessing Ripple Context

Widgets can access the core engine via Svelte's `getContext`:

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import type { StateManager } from '@ripple-ui/svelte';
  import type { EventDispatcher } from '@ripple-ui/svelte';

  const stateManager = getContext<StateManager>('ui-state');
  const eventDispatcher = getContext<EventDispatcher>('ui-events');
  const dataStore = getContext<Record<string, unknown>>('ui-data');
  const getWidget = getContext<(type: string) => any>('ui-widget-resolver');

  // Read state directly
  const count = $derived(stateManager.state.count);

  // Modify state
  function increment() {
    stateManager.set('count', (stateManager.get('count') as number) + 1);
  }
</script>
```

## Registry API

```typescript
import {
  registerWidget,
  unregisterWidget,
  hasWidget,
  getWidget,
  getWidgetTypes,
  resetRegistry
} from '@ripple-ui/svelte';

registerWidget('my-widget', MyComponent);   // Add a widget
unregisterWidget('my-widget');               // Remove a widget
hasWidget('my-widget');                      // Check if registered
getWidget('button');                         // Get component by type
getWidgetTypes();                            // List all type names
resetRegistry();                             // Restore built-in defaults
```

## Overriding Built-in Widgets

You can replace any built-in widget:

```typescript
import { registerWidget } from '@ripple-ui/svelte';
import CustomButton from './CustomButton.svelte';

registerWidget('button', CustomButton);
```

Use `resetRegistry()` to restore the defaults.

## Catalog as Allowlist

> [!NOTE]
> **Status (2026-05-25):** shipped — render-time catalog gate + the `media/` escape-hatch category landed in PR ripple#42. This doc was lagging; updated to match runtime.

As of 2026-05-22 the widget registry is the **allowlist** of renderable
types. Every node in a spec must declare a `type` that resolves to a
registered widget (or to a control-flow type — `if` / `each`). Anything
else is **out of catalog** and fails loud at render time.

### How the gate validates

`NodeRenderer` checks each node's `type` against the registry at mount.
An unregistered type renders a red error box in place of the widget,
naming the offending `type` and the node `id` so the spec author can
pinpoint it. The UI keeps mounting around it — one bad node never
brings the whole spec down.

Hosts that want to fail the whole spec up front (or strip / warn
before mount) can call `validateCatalog`:

```typescript
import { validateCatalog } from '@ripple-ui/svelte';

const unknown = validateCatalog(spec, {
  // Custom widgets registered after import — and any types
  // resolved through a host-side resolver — go here so the gate
  // doesn't false-positive on them.
  extraWidgetTypes: ['my-widget']
});

if (unknown.length > 0) {
  // [{ path: 'ui.children[2]', type: 'definitely-not-a-real-widget' }, ...]
  throw new Error(`Spec uses unknown widgets: ${unknown.map((u) => u.type).join(', ')}`);
}
```

Or opt into the built-in heads-up by passing `checkCatalog` to the
component — it runs `validateCatalog` whenever the spec changes and
`console.warn`s any out-of-catalog nodes (without blocking the render):

```svelte
<Ripple spec={spec} checkCatalog extraWidgetTypes={['my-widget']} />
```

`validateCatalog` walks both `children` and `else_children` (so
`if` branches are covered), treats `if` and `each` as known control-
flow types, and returns an empty array for `null` / `undefined` input.

### Escape-hatch widgets — when you can't register a real one

Some content can't live as a first-class widget — a trusted third-party
iframe, a one-off 3D asset, an embedded video. The `media/` category
ships two widgets that exist precisely for these cases:

- **`model-viewer`** — declarative 3D viewer. Wraps Google's
  `<model-viewer>` web component to render GLB/GLTF assets with orbit
  controls, AR, and environment lighting. Lazy-loads
  `@google/model-viewer` (~300KB) on first mount so the core bundle
  stays thin. Props are declarative only — no imperative camera API
  reaches the spec.
- **`embed`** — sandboxed iframe. Renders a remote URL (`mode: 'url'`,
  `https://` only) or an inline `srcdoc` document (length-capped) inside
  a hardened iframe. The `sandbox` attribute is renderer-controlled and
  cannot be widened by a spec; `allow-same-origin` is intentionally
  absent so the frame runs at an opaque origin and cannot read the
  pocket's cookies, localStorage, or backend. The permissions-policy
  `allow=` passes through a closed enum (fullscreen, autoplay,
  encrypted-media, picture-in-picture only).

Both nodes are normal catalog entries — they're in the registry, the
gate accepts them, and the manifest documents their props. Use them
instead of `registerWidget`-ing a one-off ad-hoc widget for trusted
embed cases.

### Decision tree — real widget vs escape hatch

```
Does the content repeat across pockets and deserve a typed prop schema?
├── Yes — promote it to a first-class widget. registerWidget(type, MyWidget).
│        Add a WIDGET_BIND_CONTRACTS entry if it has a non-default bind
│        surface (see state-management.md → "Per-widget bind contract").
│
└── No  — is it a sandboxable iframe, or a 3D model?
         ├── Iframe / video / external page → use `embed` (mode=url or
         │   mode=srcdoc). Sandboxing is non-negotiable; the spec cannot
         │   weaken it.
         ├── GLB / GLTF model                 → use `model-viewer`.
         └── Neither                          → it's likely not safe to
             render from a spec. Build a typed widget and `registerWidget`
             it on the host instead.
```

### Catalog gate failure shape

Per-node fallback (rendered by `NodeRenderer`):

```html
<div role="alert" data-ripple-unknown-widget="my-typo">
  <strong>Widget type "my-typo" isn't in the catalog.</strong>
  <span>node id: foo</span>
  <span>Use a registered widget type, or register a custom widget before mount.</span>
</div>
```

Host-side gate (from `validateCatalog`):

```ts
[
  { path: 'ui.children[0]', type: 'definitely-not-a-real-widget' },
  { path: 'ui.children[2].children[0]', type: 'mystery-b' },
  { path: 'ui.else_children[0]', type: 'ghost-widget' }
]
```

A spec is "fully covered by the catalog" when `validateCatalog` returns
`[]`. That's the contract: every `type` resolves to a registered
widget, a control-flow type, or an explicit `extraWidgetTypes` entry.
