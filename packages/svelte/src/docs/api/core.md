---
title: "@ripple-ui/core"
description: Every public export of the framework-free engine, grouped by entry point.
order: 1
---

`@ripple-ui/core` is the spec engine: schemas, expressions, state, actions, motion compilation and the headless runtime. It has no renderer and no framework dependency. `@ripple-ui/svelte` depends on it and re-exports most of it, so a Svelte app rarely imports from core directly; the exceptions are `safeUrl` and `safeStyle`, the headless runtime, and the manifest helpers.

## Entry points

| Import | What's in it |
|---|---|
| `@ripple-ui/core` | Everything below |
| `@ripple-ui/core/headless` | The headless runtime, resolver, state, dispatcher and expression functions, without the rest |
| `@ripple-ui/core/headless/slim` | `SlimHeadless`, `createSlimHeadlessRuntime` |
| `@ripple-ui/core/schema` | The Zod schemas and their types |
| `@ripple-ui/core/manifest` | The action grammar, spec envelope and slim manifest builder |
| `@ripple-ui/core/motion` | `compileMotion`, `stateToStyle` |

## Headless runtime

| Export | Signature | Notes |
|---|---|---|
| `createHeadlessRuntime` | `(options: HeadlessRuntimeOptions) => RippleHeadless` | Spec and state in, resolved tree out. See [Headless runtime](/docs/concepts/headless). |
| `RippleHeadless` | class | Same as above, constructed directly. |
| `resolveTree` | `(spec, ctx: ResolveContext) => ResolvedTree` | Pure, one-shot resolve. Returns `{ nodes, state }`. |
| `createSlimHeadlessRuntime`, `SlimHeadless` | from `/headless/slim` | Runs state actions and fire-and-forget host events only. |
| Types | `HeadlessRuntimeOptions`, `ResolvedNode`, `ResolvedTree`, `ResolveContext` | |

## State

| Export | Notes |
|---|---|
| `HeadlessStateManager`, `createHeadlessStateManager(initial?)` | Dot-path store with no framework dependency: `get`, `set`, `update`, `has`, `delete`, `reset`, `subscribe`, `state`. |
| `StateStore`, `StateSubscriber` | The interface every state store implements. The Svelte `StateManager` implements it too. |
| `getStatePath`, `setStatePath`, `appendStatePath`, `removeStatePath`, `patchState`, `applyStateOp` | Pure helpers over a plain state object. |

## Actions

| Export | Notes |
|---|---|
| `EventDispatcher`, `createEventDispatcher(state, onEvent?, widgetRegistry?, getAnimateRoot?, playMotion?)` | Runs action objects against a `StateStore`. `dispatch(handler, context, eventValue?)` takes one action or an array. |
| `FlowAbortError` | Thrown by `validate` to stop a flow. `dispatch` catches it. |
| `MAX_FLOW_DEPTH` | `8`, the deepest a `flow` may nest. |
| `CONFIRM_STATE_KEY`, `FLOW_ERROR_STATE_KEY` | `'_ripple_confirm'` and `'_flow_error'`, the reserved state keys. |
| `WidgetRegistry`, `createWidgetRegistry` | Per-render registry of widget methods that `invoke` calls. |
| Types | `OnEventCallback`, `PendingConfirm`, `MotionPlayer`, `WidgetMethod`, `RippleEvent`, `RippleEventResult` |

```ts
type OnEventCallback = (event: RippleEvent) => void | Promise<RippleEventResult | void>;
```

The event shapes are listed in [Actions and events](/docs/concepts/actions-and-events#the-event-type).

## Expressions

| Export | Signature |
|---|---|
| `resolveString` | `(value: string, ctx: ResolverContext) => unknown`. A whole-string expression keeps its type; mixed text returns a string. |
| `resolveValue` | `(value: unknown, ctx) => unknown`. Resolves strings, arrays and objects recursively. |
| `resolveObject` | `(obj: Record<string, unknown>, ctx) => Record<string, unknown>` |
| `evaluateExpression` | `(expr: string, ctx) => unknown`. The expression without braces. |
| `evaluateCondition` | `(expr: string, ctx) => boolean`. Braces optional. |
| `hasExpressions` | `(value: unknown) => boolean` |
| `withFlowContext` | Adds a flow's collected answers to a context. |
| `ResolverContext` | `{ state, data?, item?, index?, [loopName]: unknown }` |

The grammar is in [State and expressions](/docs/concepts/state-and-expressions).

## Spec helpers

| Export | Notes |
|---|---|
| `normalizeSpec(input)` | Turns any accepted input into a UniversalSpec. A UISpec becomes `intent: 'custom'`. No validation, so it is cheap to call on every render. |
| `isFlowSpec(spec)`, `unwrapFlowRoot(spec)` | Detect a multi-step flow and find its root step. |
| `newNodeId()`, `isValidNodeId(id)`, `ensureNodeIds(spec)` | Stable node ids for editing. `ensureNodeIds` only fills gaps. |
| `findById`, `findParent`, `getNodeProp` | Tree queries. |
| `applyOp` and `applyAddNode`, `applyReplaceNode`, `applySetNodeProp`, `applyMoveNode`, `applyRemoveNode`, `applySetPropArrayItem`, `applyAppendPropArrayItem`, `applyRemovePropArrayItem` | Edit a spec by node id. Each has a matching `*Op` type. |
| `validateCatalog(spec, { widgetTypes, extraWidgetTypes? })` | Returns `{ path, type }[]` for every node whose type isn't known. Core has no widgets, so pass `widgetTypes`; the version in `@ripple-ui/svelte` fills it from its registry. |
| `getBindContract(type)`, `DEFAULT_BIND_CONTRACT` | Which prop and event a widget's `bind` uses. |
| `asText(value)` | Turns any value into display text. |

## Schemas

All Zod schemas, each also exported as a type of the same name:

| Export | Notes |
|---|---|
| `UISpec`, `UINode`, `ThemeOverrides` | With `parseUISpec`, `safeParseUISpec`, `CURRENT_SPEC_VERSION`, `isCompatibleUISpecVersion`, `isCompatibleSpecVersion`. |
| `UniversalSpec`, `IntentType`, `LifecycleType`, `FlowAction` | With `parseUniversalSpec`, `safeParseUniversalSpec`. |
| `EventHandler`, `EventAction`, `EventHandlerOrArray` | One schema per action as well, such as `SetHandler` and `ApiHandler`. |
| `Motion` | The node `motion` field. |
| `BrandPack`, `BrandTokens` | With `parseBrandPack`, `safeParseBrandPack`, `BRAND_COLOR_ROLES`. |
| `WidgetType`, `WIDGET_CATEGORIES` | |

## Theme and brand

| Export | Notes |
|---|---|
| `themeToCssVars(theme)`, `themeToStyleString(theme)` | A spec `theme` as CSS custom properties. |
| `brandToCssVars(brand, opts)`, `brandToStyleString(brand, opts)` | A brand pack as CSS custom properties. `opts.mode` picks `light` or `dark`. |

See [Theming](/docs/guides/theming).

## URL safety

| Export | Signature | Notes |
|---|---|---|
| `safeUrl` | `(value: unknown, opts?: { kind?: 'link' \| 'resource' }) => string \| undefined` | `link` (default) allows relative paths, `http`, `https`, `mailto` and `tel`, and returns `undefined` for anything else. `resource` allows relative paths (not `//host`), `http`, `https` and `data:image/(png\|gif\|jpeg\|webp)`, and returns `undefined` for anything else. Empty or non-string input returns `undefined`. |
| `safeStyle` | `(style: string \| Record<string, unknown>) => same type` | Drops declarations whose `url()` or `image-set()` target fails `safeUrl(..., { kind: 'resource' })`, plus `expression(`, `-moz-binding` and property names that aren't plain CSS identifiers. |

Detection decodes HTML entities and percent-escapes once and ignores whitespace and control characters, so `java&#x61;script:` and `java\tscript:` are caught.

## Motion

| Export | Notes |
|---|---|
| `compileMotion`, `stateToStyle` | Compile a node's `motion` into keyframes and styles. Playing them needs a DOM, so that part lives in the renderer. |
| `resolvePreset`, `resolveEasing`, `springToCssTiming`, `ffTokenToCssTiming`, `FF_SPRING_TOKENS`, `EASING_CUBIC_BEZIER` | Presets and timing. |
| `rewriteForReducedMotion` | Swaps movement for fades when the user prefers reduced motion. |
| `loadAnimate`, `loadInView` | Lazy loaders for the animation engine. Importing core never loads it. |

## Manifest

From `@ripple-ui/core/manifest`:

| Export | Notes |
|---|---|
| `manifestActions` | The grammar of every action, as the full manifest prints it. |
| `specEnvelope` | The top-level spec contract (`ui`, `state`, version, the names a model must not use for `ui`). |
| `buildSlimManifest({ widgets, actions? })` | A manifest for a slim host: the envelope, only the actions the slim runtime runs, and the widgets you pass. |
| `slimActions(names?)`, `BASE_ACTIONS` | The slim runtime's action list. |
| `SLIM_WIDGETS` | The standard small widget set: `text`, `heading`, `badge`, `button`, `flex`. |
