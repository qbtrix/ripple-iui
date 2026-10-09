---
title: "@ripple-ui/svelte"
description: The Ripple component and its props, the widget registry, the Svelte state store, and every subpath the package exports.
order: 2
---

`@ripple-ui/svelte` is the Svelte 5 renderer. It holds the `<Ripple>` component, the widget catalog, the designed layouts, streaming and the editor, and re-exports the engine functions from `@ripple-ui/core` that a Svelte app needs.

## Entry points

| Import | What's in it |
|---|---|
| `@ripple-ui/svelte` | The component, registry, state store and the engine re-exports below |
| `@ripple-ui/svelte/streaming` | `streamSpec`, `parsePartialSpec`, `StreamParseError` |
| `@ripple-ui/svelte/schema` | The Zod schemas, same as `@ripple-ui/core/schema` |
| `@ripple-ui/svelte/widgets` | The widget components and the registry |
| `@ripple-ui/svelte/ui` | The shadcn-svelte components the widgets are built from |
| `@ripple-ui/svelte/primitives` | Lower-level building blocks used by widgets |
| `@ripple-ui/svelte/editor` | The visual editor: overlay, inline editor, inspector, drag layer |
| `@ripple-ui/svelte/discover` | Server-renderable catalogue cards and their helpers |
| `@ripple-ui/svelte/styles.css` | Tailwind, default shadcn tokens and Ripple's theme, for apps without tokens |
| `@ripple-ui/svelte/theme.css` | Ripple's `--ripple-*` tokens only, for apps with their own shadcn tokens |
| `@ripple-ui/svelte/manifest.json` | Every widget with its prop schema and an example, plus the action grammar |
| `@ripple-ui/svelte/manifest.slim.json` | The spec envelope, the core actions and five standard widgets |

## Ripple

```svelte
<script lang="ts">
  import { Ripple } from '@ripple-ui/svelte';
</script>

<Ripple {spec} onEvent={(e) => console.log(e)} />
```

| Prop | Type | What it does |
|---|---|---|
| `spec` | `UISpec \| UniversalSpec` | The spec to render. |
| `state` | `Record<string, any>` | Values merged over `spec.state`. |
| `onEvent` | `OnEventCallback` | Receives the actions the spec hands to your app. See [Actions and events](/docs/concepts/actions-and-events). |
| `onStateChange` | `(path, value, state) => void` | Called on every state write. |
| `streaming` | `StreamSpecStore` | A store from `streamSpec`. When set, `spec` is ignored. |
| `skeleton` | `'card' \| 'dashboard' \| 'text' \| 'none'` | Placeholder while a stream has nothing to show. Default `card`. |
| `onComplete` | `(result: TerminalResult) => void` | Called when a multi-step flow finishes. See [Intents](/docs/guides/intents). |
| `onSpecChanged` | `(spec: DashboardSpec) => void` | Called when a user rearranges a dashboard. |
| `checkCatalog` | `boolean` | Warn in the console about unknown widget types whenever the spec changes. |
| `extraWidgetTypes` | `string[]` | Types `checkCatalog` should treat as known. |
| `ensureIds` | `boolean` | Give every node without an `id` a stable one, in place. For editors. |
| `brand` | `BrandPack` | Design tokens applied to this render. See [Theming](/docs/guides/theming). |
| `brandMode` | `'light' \| 'dark'` | Which colour slot of the brand pack to use. |
| `class`, `style` | `string` | On the root element. |

## Widget registry

| Export | Signature |
|---|---|
| `registerWidget` | `(type: string, component: Component) => void` |
| `unregisterWidget` | `(type: string) => void` |
| `hasWidget` | `(type: string) => boolean` |
| `getWidget` | `(type: string) => Component \| undefined` |
| `getWidgetTypes` | `() => string[]` |
| `resetRegistry` | `() => void`, back to the built-in set |

See [Custom widgets](/docs/guides/custom-widgets).

## validateCatalog

```ts
validateCatalog(spec: UISpec | UINode | null | undefined, opts?: {
  extraWidgetTypes?: string[];
  widgetTypes?: string[];   // defaults to getWidgetTypes()
}): { path: string; type: string }[]
```

Returns every node whose `type` is not a registered widget, `if`, `each` or one of `extraWidgetTypes`. An empty array means the whole spec is in the catalog. It walks `children` and `else_children`. This version is bound to the Svelte registry, so custom widgets you registered count as known; the one in `@ripple-ui/core` needs `widgetTypes` passed in.

## State

| Export | Notes |
|---|---|
| `StateManager`, `createStateManager(initial?)` | The `$state`-backed store a render uses: `state`, `get`, `set`, `update`, `has`, `delete`, `reset`, `subscribe`. |

## Streaming

From `@ripple-ui/svelte/streaming`:

| Export | Notes |
|---|---|
| `streamSpec(source, options?)` | Returns a `StreamSpecStore` with `current`, `done`, `error`, `cancel()`. Options: `throttleMs`, `maxBufferBytes`, `signal`, `onUpdate`, `allow`. |
| `parsePartialSpec(text, allow?)` | Parses a partial spec string. Returns `{ value }`, `null` when nothing parses yet. |
| `StreamParseError` | `kind` is `malformed`, `incomplete`, `overflow` or `aborted`; `lastValid` holds the last good spec. |
| `DEFAULT_ALLOW` | The partial-parser flags `streamSpec` uses. |
| Types | `StreamSpec`, `StreamSpecOptions`, `StreamSpecStore`, `StreamParseErrorKind`, `ParseResult` |

See [Streaming](/docs/concepts/streaming).

## Flows and layouts

| Export | Notes |
|---|---|
| `ChainExecutor` | The multi-step flow state machine. |
| `FlowRunner` | The component that hosts a flow. |
| `MAX_HISTORY_DEPTH` | How many steps a flow keeps for back navigation. |
| `buildOnboardingWizard` | A sample flow spec. |
| Types | `ChainState`, `TerminalResult` |

## Svelte actions and motion helpers

| Export | Notes |
|---|---|
| `withMotion` | A `use:` action that plays a node's `motion`. |
| `reorderable` | A `use:` action for drag-to-reorder lists. |
| `movingIndicator` | A `use:` action that slides an indicator between items, as tabs do. |
| `wghtStyle`, `animateWght` | Variable font weight helpers. |
| `proximity`, `proximityHover` | Pointer-proximity effects. |
| `nextElevation`, `surfaceVar`, `currentElevation`, `provideElevation`, `ELEVATION_MAX` | Nested surface elevation through context. |

## Re-exported from @ripple-ui/core

These are the same functions as in [@ripple-ui/core](/docs/api/core):

- Actions: `EventDispatcher`, `createEventDispatcher`, `FlowAbortError`, `MAX_FLOW_DEPTH`, `CONFIRM_STATE_KEY`, `FLOW_ERROR_STATE_KEY`, `WidgetRegistry`, `createWidgetRegistry`
- Expressions: `evaluateExpression`, `resolveString`, `resolveObject`, `resolveValue`, `evaluateCondition`, `hasExpressions`, `withFlowContext`
- Spec helpers: `normalizeSpec`, `newNodeId`, `isValidNodeId`, `ensureNodeIds`, `findById`, `findParent`, the `apply*` edit operations and `applyOp`, the `*StatePath` helpers, `patchState`, `applyStateOp`
- Theme: `themeToCssVars`, `themeToStyleString`, `FF_SPRING_TOKENS`
- Schemas: `UISpec`, `UINode`, `ThemeOverrides`, `parseUISpec`, `safeParseUISpec`, `CURRENT_SPEC_VERSION`, `isCompatibleUISpecVersion`, `isCompatibleSpecVersion`, `UniversalSpec`, `IntentType`, `LifecycleType`, `FlowAction`, `parseUniversalSpec`, `safeParseUniversalSpec`, `EventHandler`, `EventAction`, `EventHandlerOrArray`, `WidgetType`, `WIDGET_CATEGORIES`
- Types: `RippleEvent`, `RippleEventResult`, `OnEventCallback`, `PendingConfirm`, `WidgetMethod`, `ResolverContext`

`safeUrl`, `safeStyle`, the brand helpers, the headless runtime and the manifest helpers are not re-exported. Import them from `@ripple-ui/core`.
