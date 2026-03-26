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
