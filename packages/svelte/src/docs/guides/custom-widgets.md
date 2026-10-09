---
title: Custom widgets
description: Register your own Svelte component as a widget type, replace a built-in one, and keep the catalog check passing.
order: 1
---

The widget catalog is a registry you can add to. Register a Svelte 5 component under a type name and specs can use it like any built-in widget.

## Register a widget

```ts
import { registerWidget } from '@ripple-ui/svelte';
import PriceTag from './PriceTag.svelte';

registerWidget('price-tag', PriceTag);
```

Register before the first `<Ripple>` mounts, for example in your root layout. Specs can now use it:

```json
{ "type": "price-tag", "props": { "amount": 42, "currency": "EUR" } }
```

The registry is global to the page. The other registry functions:

```ts
import { getWidget, hasWidget, getWidgetTypes, unregisterWidget, resetRegistry } from '@ripple-ui/svelte';

hasWidget('price-tag');        // true
getWidget('button');           // the component for a type
getWidgetTypes();              // every registered type name
unregisterWidget('price-tag');
resetRegistry();               // back to the built-in set
```

## Write the component

A widget is an ordinary Svelte 5 component. The node's `props` arrive as component props, already resolved, so `{state.count}` reaches you as a number.

```svelte
<!-- PriceTag.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    id,
    class: className,
    style,
    children,
    amount = 0,
    currency = 'USD',
    onclick
  }: {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    children?: Snippet;
    amount?: number;
    currency?: string;
    onclick?: () => void;
  } = $props();

  const label = $derived(new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount));
  const css = $derived(style ? Object.entries(style).map(([k, v]) => `${k}: ${v}`).join('; ') : undefined);
</script>

<button type="button" {id} class={className} style={css} {onclick}>
  {label}
  {@render children?.()}
</button>
```

What Ripple passes in:

- **`id`, `class`, `style`** from the node. `style` is a record, already filtered for unsafe values.
- **`children`** as a snippet, when the node has children.
- **Event props.** `on_click` arrives as `onclick`, `on_change` as `onchange`, and so on. A widget's own event `on_<name>` arrives as `on<name>`, lowercase with the underscores dropped: `on_open_change` becomes `onopenchange`. A prop named `onOpenChange` never receives it.
- **The bound value**, when the node has `bind`. By default it goes to `value`, and calling `onchange(newValue)` writes it back.

## Guard every URL you render

A spec is model output, and an expression can build a `javascript:` URL while it renders (`"{'java' + 'script:alert(1)'}"`). Pass any prop that lands in `href`, `src`, `poster`, a form `action` or `window.open` through `safeUrl` from `@ripple-ui/core`, on the final value, where you use it:

```svelte
<script lang="ts">
  import { safeUrl } from '@ripple-ui/core';
  let { href, image }: { href?: string; image?: string } = $props();
</script>

<a href={safeUrl(href)}>Read more</a>
<img src={safeUrl(image, { kind: 'resource' })} alt="" />
```

An unsafe link becomes `'#'`; an unsafe resource becomes `undefined`, so the attribute is dropped. If you build a style string from props yourself, pass it through `safeStyle`. All built-in widgets do both.

## Reach the engine from a widget

Ripple puts its runtime in Svelte context:

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import type { StateManager, EventDispatcher } from '@ripple-ui/svelte';

  const state = getContext<StateManager>('ui-state');
  const events = getContext<EventDispatcher>('ui-events');

  const count = $derived(state.state.count as number);

  function increment() {
    state.set('count', count + 1);
  }
</script>
```

| Key | What it holds |
|---|---|
| `ui-state` | The render's `StateManager` |
| `ui-events` | Its `EventDispatcher` |
| `ui-data` | The host data object |
| `ui-widget-resolver` | `getWidget`, to look up another widget by type |
| `ui-widget-registry` | The per-render `WidgetRegistry` that `invoke` calls into |

Prefer props and events over context where you can: a widget that only reads props works in any spec and is easy to test.

## Methods for invoke

The `invoke` action calls a method on a widget by its `id`. To take part, register the method on mount and return the unregister function from the effect:

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import type { WidgetRegistry } from '@ripple-ui/svelte';

  let { id }: { id?: string } = $props();
  const registry = getContext<WidgetRegistry | undefined>('ui-widget-registry');

  let highlighted = $state(false);

  $effect(() => {
    if (!id || !registry) return;
    return registry.register(id, 'flash', () => {
      highlighted = true;
      setTimeout(() => (highlighted = false), 600);
    });
  });
</script>
```

A spec can then run `{ "action": "invoke", "target": "total", "method": "flash" }`.

## Binding to a prop other than value

Built-in widgets that bind something other than `value` (a checkbox binds `checked`, a wizard binds `currentStep`) have a binding contract in the engine; `getBindContract(type)` from `@ripple-ui/core` returns it. There is no public API to add a contract, so a custom widget gets the default: it receives the bound value as `value` and writes back by calling `onchange(newValue)`. In development, Ripple logs a one-time warning for a bound widget type it has no contract for; the binding still works through the default.

## Replace a built-in widget

Register under an existing type name to override it:

```ts
import { registerWidget } from '@ripple-ui/svelte';
import BrandButton from './BrandButton.svelte';

registerWidget('button', BrandButton);
```

Keep the props the built-in takes (see its page in the [widget reference](/docs/widgets/button)), or specs written for the built-in will lose features. `resetRegistry()` restores the default.

## The catalog check

The registry is also the allowlist. A node whose `type` isn't registered (and isn't `if` or `each`) renders as a red box naming the type and node id, and the rest of the spec renders around it.

To reject a spec before mounting it, call `validateCatalog`. It returns every unknown node with its path:

```ts
import { validateCatalog } from '@ripple-ui/svelte';

const unknown = validateCatalog(spec);
// [{ path: 'ui.children[2]', type: 'pricetag' }]
```

Custom widgets registered with `registerWidget` count as known. Types your app resolves some other way go in `extraWidgetTypes`:

```ts
validateCatalog(spec, { extraWidgetTypes: ['my-host-widget'] });
```

Or let the component warn in the console whenever the spec changes, without blocking the render:

```svelte
<Ripple {spec} checkCatalog extraWidgetTypes={['my-host-widget']} />
```

## When not to write a widget

Two built-ins cover content that shouldn't become a one-off widget:

- **`embed`** shows a remote page (`mode: 'url'`, `https` only) or an inline document (`mode: 'srcdoc'`) in a sandboxed iframe. The sandbox is set by the renderer and a spec can't widen it. The frame runs at an opaque origin, so it can't read your cookies or storage. `allow` accepts only `fullscreen`, `autoplay`, `encrypted-media` and `picture-in-picture`.
- **`model-viewer`** shows a GLB or glTF 3D model with orbit controls, and loads its viewer only when first used.

If the content repeats across specs and deserves typed props, write a widget. If it is a third-party page or video, use `embed`. If it is neither, it probably shouldn't be rendered from a spec at all.
