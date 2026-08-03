# API Reference

All public exports from `@ripple-ui/svelte`.

## Components

### `Ripple`

The root rendering component.

```svelte
<Ripple
  spec={spec}
  state={{ override: 'value' }}
  onEvent={(e) => console.log(e)}
  class="my-class"
  style="max-width: 600px"
/>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `spec` | `UniversalSpec \| UISpec \| any` | Yes | JSON specification |
| `state` | `Record<string, any>` | No | State overrides |
| `onEvent` | `OnEventCallback` | No | External event handler |
| `class` | `string` | No | Root CSS class |
| `style` | `string` | No | Root inline style |

---

## Core Engine

### StateManager

```typescript
import { StateManager, createStateManager } from '@ripple-ui/svelte';
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(initialState?: Record<string, unknown>)` | Create with initial state |
| `state` | `Record<string, unknown>` (getter) | Reactive state proxy |
| `get` | `(path: string) => unknown` | Read by dot-path |
| `set` | `(path: string, value: unknown) => void` | Write by dot-path |
| `update` | `(path: string, updater: (v) => v) => void` | Functional update |
| `has` | `(path: string) => boolean` | Check existence |
| `delete` | `(path: string) => void` | Remove value |
| `reset` | `(newState?: Record<string, unknown>) => void` | Replace state |

### EventDispatcher

```typescript
import { EventDispatcher, createEventDispatcher } from '@ripple-ui/svelte';
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(stateManager, onEvent?)` | Create with state and callback |
| `dispatch` | `(handler, context, eventValue?) => Promise<void>` | Dispatch handler(s) |

### Expression Functions

```typescript
import {
  evaluateExpression,
  resolveString,
  resolveObject,
  resolveValue,
  evaluateCondition,
  hasExpressions
} from '@ripple-ui/svelte';
```

| Function | Signature | Description |
|----------|-----------|-------------|
| `evaluateExpression` | `(expr: string, ctx: ResolverContext) => unknown` | Evaluate a single expression |
| `resolveString` | `(value: string, ctx: ResolverContext) => unknown` | Resolve `{expressions}` in a string |
| `resolveObject` | `(obj: Record, ctx: ResolverContext) => Record` | Resolve all expressions in an object |
| `resolveValue` | `(value: unknown, ctx: ResolverContext) => unknown` | Resolve any value recursively |
| `evaluateCondition` | `(expr: string, ctx: ResolverContext) => boolean` | Evaluate as boolean |
| `hasExpressions` | `(value: unknown) => boolean` | Check if value contains `{...}` |

### Normalizer

```typescript
import { normalizeSpec } from '@ripple-ui/svelte';
```

| Function | Signature | Description |
|----------|-----------|-------------|
| `normalizeSpec` | `(input: any) => UniversalSpec` | Convert any input to UniversalSpec |

---

## Widget Registry

```typescript
import {
  getWidget,
  registerWidget,
  unregisterWidget,
  hasWidget,
  getWidgetTypes,
  resetRegistry
} from '@ripple-ui/svelte';
```

| Function | Signature | Description |
|----------|-----------|-------------|
| `getWidget` | `(type: string) => Component \| undefined` | Get widget by type |
| `registerWidget` | `(type: string, component: Component) => void` | Register a widget |
| `unregisterWidget` | `(type: string) => void` | Remove a widget |
| `hasWidget` | `(type: string) => boolean` | Check registration |
| `getWidgetTypes` | `() => string[]` | List all registered types |
| `resetRegistry` | `() => void` | Restore built-in defaults |

---

## Schemas (Zod)

### UISpec

```typescript
import { UISpec, UINode, ThemeOverrides, parseUISpec, safeParseUISpec, CURRENT_SPEC_VERSION, isCompatibleUISpecVersion } from '@ripple-ui/svelte';
```

### UniversalSpec

```typescript
import { UniversalSpec, IntentType, LifecycleType, parseUniversalSpec, safeParseUniversalSpec } from '@ripple-ui/svelte';
```

### Event Handler

```typescript
import { EventHandler, EventAction, EventHandlerOrArray } from '@ripple-ui/svelte';
```

### Widget Types

```typescript
import { WidgetType, WIDGET_CATEGORIES } from '@ripple-ui/svelte';
```

---

## Types

### ResolverContext

```typescript
interface ResolverContext {
  state: Record<string, unknown>;
  data?: Record<string, unknown>;
  item?: unknown;
  index?: number;
  [key: string]: unknown;  // Custom loop variables
}
```

### RippleEvent

```typescript
type RippleEvent = {
  type: 'api' | 'navigate' | 'toast' | 'emit' | 'pin' | 'unpin';
  url?: string;
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  target?: string;
  message?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  name?: string;
  payload?: unknown;
};
```

### OnEventCallback

```typescript
type OnEventCallback = (event: RippleEvent) => void;
```

---

## Widget Categories

```typescript
const WIDGET_CATEGORIES = {
  layout:    ['container', 'flex', 'grid', 'card', 'tabs', 'dashboard', 'dashboard-slot'],
  display:   ['text', 'heading', 'image', 'badge', 'progress', 'avatar', 'metric', 'feed'],
  input:     ['button', 'input', 'select', 'checkbox', 'switch'],
  data:      ['table', 'chart'],
  control:   ['if', 'each'],
  composite: ['terminal']
};
```

### Built-in Aliases

| Alias | Maps To |
|-------|---------|
| `label` | `text` |
