<!--
  Ripple.svelte — Main entry point for Ripple UI rendering.
  Updated: 2026-06-27 (SP-0 editor spike) — added an opt-in `ensureIds` prop.
  When true, a WeakSet-guarded $effect runs `ensureNodeIds` once per distinct
  `ui` root, filling stable `n_xxxxxxxx` ids on any node that lacks one so the
  visual-editor overlay can address rendered nodes. Default OFF — plain renders
  are byte-identical and the caller's spec is never mutated. Finding: neither
  Ripple nor `normalizeSpec` assigned node ids before this; ids existed only if
  the backend/author supplied them.
  Updated: 2026-06-09 — silenced two state_referenced_locally compiler warnings.
  Both are intentional one-time init reads, NOT reactivity bugs: `mergedInitialState`
  seeds the StateManager once (a separate $effect at the spec-state sync block keeps
  later spec.state changes in sync), and `onEvent` is read once when passed to
  setContext (which itself captures once at init). svelte-ignore on the line directly
  above each statement, per the verified recipe.
  Updated: 2026-06-07 — intent→layout slice: the non-flow render path now routes
  through IntentRenderer, which dispatches on `spec.intent` to a DESIGNED layout
  (form→FormLayout, confirm→SummaryLayout, dashboard→DashboardRenderer) and falls
  back to NodeRenderer for `custom` and any unmapped intent. Behaviour is
  identical for `custom`/dashboard and any spec not explicitly mapped (still
  NodeRenderer / DashboardRenderer). The flow context (from a hosting FlowRunner)
  is threaded into IntentRenderer so a confirm STEP can summarize earlier answers.
  Updated: 2026-05-31 — Chain Flow auto-detection on EVERY surface (RFC 13,
  completes PR #49). The base renderer now detects a chain spec via `isFlowSpec`
  and hosts it in a `FlowRunner` (so a multi-step flow advances client-side in a
  Pocket / dashboard / any non-chat surface, not just paw-enterprise's chat
  frame). `unwrapFlowRoot` hands FlowRunner the actual chain root, unwrapping the
  `{version, ui:<root>}` envelope that `start_flow` emits. Added a `flowHosted`
  prop (default false) as the RECURSION GUARD: FlowRunner mounts an inner
  `<Ripple flowHosted={true}>` per step, and since a non-terminal step still
  carries its onward chain fields, that flag stops the inner Ripple from
  re-detecting the step as a flow and nesting a second FlowRunner. A terminal
  step's completion is forwarded to this component's `onComplete` prop. The
  non-flow path is untouched — byte-identical output for plain specs.
  Updated: 2026-05-30 (PR #45 animate runtime) — bind:this on the ripple-root and
  pass a lazy `() => rootEl` resolver into the EventDispatcher so the `animate`
  action can locate its target node (by widget id) inside THIS instance's subtree
  and run the built-in pulse, correctly scoped (never reaching a sibling render).
  Updated: 2026-05-30 — apply spec.theme to the ripple-root via
  themeToStyleString (RFC 12 white-label — Ripple previously parsed theme but
  never applied it). The host `style` prop and the theme vars are merged on the
  root div.
  Previous (2026-05-22): Opt-in catalog gate: when `checkCatalog` is true,
  Ripple runs `validateCatalog` on the spec before mount and warns about any
  out-of-catalog node types. Non-breaking — it never blocks rendering;
  NodeRenderer still shows its loud red box per unknown node (Increment 5).
  Previous (2026-04-21): Flow actions wiring — instantiate a per-instance
  WidgetRegistry, expose via 'ui-widget-registry' context, thread to the
  EventDispatcher, and auto-mount the ConfirmDialog overlay so any confirm
  action surfaces without extra spec.
  Previous (2026-04-16): Added streaming + skeleton props. When a StreamSpecStore
  is passed via `streaming`, Ripple renders a Skeleton until the first valid
  parse arrives, then switches to the live spec.
-->
<script lang="ts">
  import { setContext, getContext } from 'svelte';
  import type { UISpec } from './schema/ui-spec.js';
  import type { UniversalSpec } from './schema/universal-spec.js';
  import type { StreamSpecStore } from './streaming/types.js';
  import { createStateManager } from './core/state-manager.svelte.js';
  import { createEventDispatcher, type OnEventCallback } from './core/event-dispatcher.js';
  import { createWidgetRegistry } from './core/widget-registry.js';
  import { createToastBus, type ToastVariant } from './core/toast-bus.svelte.js';
  import { normalizeSpec } from './core/normalizer.js';
  import { themeToStyleString } from './core/theme-applier.js';
  import { validateCatalog } from './core/validate-catalog.js';
  import { isFlowSpec, unwrapFlowRoot } from './core/flow-spec.js';
  import { ensureNodeIds } from './core/spec-id.js';
  import type { UINode } from './schema/ui-spec.js';
  import { getWidget } from './widgets/index.js';
  import NodeRenderer from './components/NodeRenderer.svelte';
  import DashboardRenderer from './intent/DashboardRenderer.svelte';
  import IntentRenderer from './intent/IntentRenderer.svelte';
  import FlowRunner from './intent/FlowRunner.svelte';
  import Skeleton from './widgets/display/Skeleton.svelte';
  import ConfirmDialog from './widgets/overlay/ConfirmDialog.svelte';
  import type { DashboardSpec } from './intent/dashboard-manager.svelte.js';
  import type { TerminalResult } from './intent/chain-executor.svelte.js';
  import type { RippleEvent } from './types.js';

  interface Props {
    spec?: UniversalSpec | UISpec | any;
    streaming?: StreamSpecStore;
    skeleton?: 'card' | 'dashboard' | 'text' | 'none';
    state?: Record<string, any>;
    onEvent?: OnEventCallback;
    onSpecChanged?: (spec: DashboardSpec) => void;
    onStateChange?: (path: string, value: unknown, state: Record<string, unknown>) => void;
    /**
     * Fired when a hosted Chain Flow reaches a terminal step — the step's
     * `onComplete` FlowAction plus the full accumulated payload (RFC 13). Only
     * meaningful when `spec` is a flow; ignored for plain specs. Forwarded
     * straight from the `FlowRunner` this renderer mounts.
     */
    onComplete?: (result: TerminalResult) => void;
    /**
     * RECURSION GUARD for Chain Flows. `FlowRunner` mounts one inner `<Ripple>`
     * per step with `flowHosted={true}`; a non-terminal step still carries its
     * onward `chain`/`chain_map`, so without this flag the inner Ripple would
     * re-detect the step as a flow and nest a second `FlowRunner` forever. When
     * true, flow auto-detection is skipped and the step's node tree renders as a
     * plain spec. Host callers never set this — it is internal wiring.
     */
    flowHosted?: boolean;
    /**
     * Opt-in catalog gate. When true, Ripple runs `validateCatalog` on the
     * spec before mount and `console.warn`s any out-of-catalog node types.
     * Non-breaking — rendering is never blocked; NodeRenderer still shows a
     * loud red box per unknown node.
     */
    checkCatalog?: boolean;
    /** Extra widget types to treat as known when `checkCatalog` is on. */
    extraWidgetTypes?: string[];
    /**
     * SP-0 editor spike. When true, Ripple assigns a stable `n_xxxxxxxx` id to
     * every node in the spec's `ui` tree that lacks one (via `ensureNodeIds`),
     * IN PLACE, once per distinct `ui` root. The visual editor turns this on so
     * the overlay can address each rendered node by id and so edits persist.
     *
     * Default OFF — a plain render is byte-identical to before and never mutates
     * the caller's spec. `ensureNodeIds` only FILLS gaps (existing ids are kept;
     * only sibling-duplicate ids are reassigned), so an already-id'd spec is
     * untouched even when this is on.
     */
    ensureIds?: boolean;
    class?: string;
    style?: string;
  }

  let {
    spec: rawSpec,
    streaming,
    skeleton = 'card',
    state: initialStateOverride,
    onEvent,
    onSpecChanged,
    onStateChange,
    onComplete,
    flowHosted = false,
    checkCatalog = false,
    extraWidgetTypes,
    ensureIds = false,
    class: className = '',
    style
  }: Props = $props();

  const resolvedSpec = $derived(streaming?.current ?? rawSpec);
  const spec = $derived(normalizeSpec(resolvedSpec));

  // White-label keystone (RFC 12): emit spec.theme as CSS custom properties on
  // the ripple-root so a host's brand applies with no per-site CSS authoring.
  const themeStyle = $derived(themeToStyleString((spec as { theme?: unknown }).theme as never));

  // Chain Flow auto-detection (RFC 13, every-surface). A chain spec is hosted in
  // a `FlowRunner` so it advances client-side; a plain spec renders as before.
  // `flowHosted` is the recursion guard — FlowRunner's per-step inner <Ripple>
  // sets it, so a non-terminal step (which still carries its onward chain
  // fields) is rendered as a plain node tree instead of nesting another runner.
  // `unwrapFlowRoot` returns the actual chain root: `spec` itself, or its inner
  // `ui` node for the `{version, ui:<root>}` envelope `start_flow` emits (which
  // FlowRunner needs because it reads `chain`/`chain_map` off the TOP of its
  // spec). Detection runs on the normalized `spec` so all arrival shapes agree.
  const isFlow = $derived(!flowHosted && isFlowSpec(spec));
  const flowRoot = $derived(isFlow ? unwrapFlowRoot<UniversalSpec>(spec) : null);

  const mergedInitialState = $derived({
    ...((spec as any).state ?? {}),
    ...(initialStateOverride ?? {})
  });

  // svelte-ignore state_referenced_locally
  const stateManager = createStateManager(mergedInitialState);
  const widgetRegistry = createWidgetRegistry();
  const toastBus = createToastBus();

  // Chain: forward toast events into the in-process bus AND to any host onEvent.
  // Hosts that already render toasts continue to work; specs that mount a
  // `<toast />` widget get rendering for free. The host's return value is
  // preserved so `api` action chaining (on_success/on_error/response_key) works.
  const chainedOnEvent: OnEventCallback = (event: RippleEvent) => {
    if (event.type === 'toast') {
      const rawVariant = (event as { variant?: string }).variant;
      const variant: ToastVariant =
        rawVariant === 'success' || rawVariant === 'warning' || rawVariant === 'error'
          ? rawVariant
          : 'info';
      const rawMessage = (event as { message?: unknown }).message;
      toastBus.push({
        message: typeof rawMessage === 'string' ? rawMessage : String(rawMessage ?? ''),
        variant
      });
    }
    return onEvent?.(event);
  };

  // Root element ref — lets the dispatcher's `animate` action find its target
  // node (by widget id) inside THIS Ripple instance's subtree, so the built-in
  // pulse is correctly scoped and never reaches into a sibling render. Read
  // lazily (closure) because the dispatcher is constructed before mount.
  let rootEl = $state<HTMLElement | undefined>(undefined);
  const eventDispatcher = createEventDispatcher(
    stateManager,
    chainedOnEvent,
    widgetRegistry,
    () => rootEl
  );
  let dataStore = $state<Record<string, unknown>>({});

  // Sync external state prop changes into the stateManager reactively.
  // This allows data_sources and other async state updates to flow in
  // after the initial render.
  //
  // We deep-compare via JSON because $state wraps arrays/objects in proxies —
  // a simple `value !== stateManager.get(key)` comparison would always be true
  // for non-primitive values (proxy !== plain object), causing infinite loops
  // when callers pass arrays / objects through this prop.
  function shallowDifferent(a: unknown, b: unknown): boolean {
    if (a === b) return false;
    if (a == null || b == null) return a !== b;
    if (typeof a !== 'object' || typeof b !== 'object') return a !== b;
    try {
      return JSON.stringify(a) !== JSON.stringify(b);
    } catch {
      return true;
    }
  }

  $effect(() => {
    if (!initialStateOverride) return;
    for (const [key, value] of Object.entries(initialStateOverride)) {
      if (value === undefined) continue;
      if (shallowDifferent(value, stateManager.get(key))) {
        stateManager.set(key, value);
      }
    }
  });

  // External writes to `spec.state` (pocket SSE mutations, hot-reloaded
  // specs) need to flow into the live stateManager too — it deep-clones
  // `spec.state` at construction and otherwise runs disconnected. Track
  // the last-synced snapshot and push only deltas, so a user typing into
  // a `{state.draft}`-bound input doesn't get clobbered on every
  // re-render: their write touches stateManager but never spec.state, so
  // the diff stays empty for that key.
  // Plain `let` (not `$state`) — this is a snapshot tracker we both read
  // and write inside the same effect; making it reactive would create a
  // self-dependency that re-runs the effect on every sync.
  let lastSyncedSpecState: Record<string, unknown> = {};
  $effect(() => {
    const next = (spec as any).state;
    if (!next || typeof next !== 'object') return;
    const overrideKeys = initialStateOverride
      ? new Set(Object.keys(initialStateOverride))
      : null;
    for (const [key, value] of Object.entries(next)) {
      // initialStateOverride wins on conflict — preserve the host's
      // API-data precedence from `mergedInitialState`.
      if (overrideKeys && overrideKeys.has(key)) continue;
      if (!shallowDifferent(value, lastSyncedSpecState[key])) continue;
      if (shallowDifferent(value, stateManager.get(key))) {
        stateManager.set(key, value);
      }
      lastSyncedSpecState[key] = value;
    }
  });

  setContext('ui-state', stateManager);
  setContext('ui-events', eventDispatcher);
  setContext('ui-data', dataStore);
  setContext('ui-widget-resolver', getWidget);
  setContext('ui-widget-registry', widgetRegistry);
  // Expose the host onEvent so nested ripple-frame instances can forward
  // their inner events back up to the outermost host.
  // svelte-ignore state_referenced_locally
  setContext('ui-host-event', onEvent);
  setContext('ui-toasts', toastBus);

  $effect(() => {
    if (!onStateChange) return;
    return stateManager.subscribe(onStateChange);
  });

  // Flow context, if this Ripple is rendered inside a hosting FlowRunner. The
  // host provides `setContext('ui-flow-context', () => executor.context)`; we
  // read it as a getter so a confirm STEP's IntentRenderer can summarize the
  // earlier answers. Absent (undefined) for a standalone, non-flow render.
  const getFlowContext = getContext<(() => Record<string, unknown>) | undefined>('ui-flow-context');

  // Intents routed to a DESIGNED layout via IntentRenderer. Everything else
  // (custom + any unmapped intent) keeps the byte-identical NodeRenderer path.
  // Wave 3 (layouts): expanded from form/confirm to all structured intents.
  // custom / action / workspace remain as NodeRenderer escape hatches inside
  // IntentRenderer itself — they never block a render.
  const DESIGNED_INTENTS = new Set([
    'form', 'confirm', 'quick_confirm',
    'browse', 'select', 'detail', 'info', 'search',
  ]);

  let renderMode = $derived.by(
    (): 'dashboard' | 'intent' | 'node' | 'empty' | 'skeleton' | 'stream-error' => {
      if (streaming && streaming.done && streaming.error && streaming.current == null) {
        return 'stream-error';
      }
      if (streaming && streaming.current == null && !streaming.done) return 'skeleton';
      if (spec.intent === 'dashboard') return 'dashboard';
      // Designed layouts dispatch through IntentRenderer.
      if (DESIGNED_INTENTS.has(spec.intent as string)) return 'intent';
      if (spec.ui) return 'node';
      return 'empty';
    }
  );

  const streamingError = $derived(streaming?.error ?? null);

  // Opt-in catalog gate. Runs whenever the spec changes; warns once per
  // distinct set of unknown types. Never blocks render — NodeRenderer's
  // per-node red box is the visible signal; this is the host-side heads-up.
  let lastCatalogWarning = '';
  $effect(() => {
    if (!checkCatalog) return;
    const tree = (spec as { ui?: unknown }).ui;
    if (!tree || typeof tree !== 'object') return;
    const unknown = validateCatalog(spec as any, { extraWidgetTypes });
    if (unknown.length === 0) {
      lastCatalogWarning = '';
      return;
    }
    const signature = unknown.map((u) => `${u.path}:${u.type}`).join(',');
    if (signature === lastCatalogWarning) return;
    lastCatalogWarning = signature;
    console.warn(
      `[Ripple] ${unknown.length} node(s) use a widget type not in the catalog:`,
      unknown
    );
  });

  // SP-0 editor spike: opt-in stable-id assignment. Runs ONCE per distinct `ui`
  // root (WeakSet-guarded) so it can't loop, and only when `ensureIds` is on.
  // The effect reads `spec.ui` (the slot) but never reads any node's `id`, so
  // writing ids back into the tree doesn't retrigger it. Default-off keeps every
  // existing Ripple consumer's behavior byte-identical.
  const ensuredRoots = new WeakSet<object>();
  $effect(() => {
    if (!ensureIds) return;
    const tree = (spec as { ui?: UINode }).ui;
    if (!tree || typeof tree !== 'object') return;
    if (ensuredRoots.has(tree)) return;
    ensuredRoots.add(tree);
    ensureNodeIds(tree);
  });
</script>

{#if isFlow && flowRoot}
  <!--
    Chain Flow (RFC 13): host the spec in a FlowRunner so it advances
    client-side on this surface. `flowRoot` is the unwrapped chain root (the
    inner `ui` node for a `{version, ui:<root>}` envelope). FlowRunner mounts a
    per-step inner <Ripple flowHosted={true}>, so the recursion guard above
    keeps detection from re-engaging on a still-chain-bearing step. Terminal
    completion forwards to this component's `onComplete`. This branch replaces
    the normal `.ripple-root` tree entirely; the non-flow path below is
    untouched (byte-identical output for plain specs).
  -->
  <FlowRunner spec={flowRoot} {onComplete} {onEvent} state={initialStateOverride} class={className} />
{:else}
<div
  bind:this={rootEl}
  class="ripple-root {className}"
  style={[style, themeStyle].filter(Boolean).join('; ')}
  data-ripple-version={spec.version}
  data-ripple-intent={spec.intent}
  data-ripple-streaming={streaming ? (streaming.done ? 'done' : 'active') : undefined}
>
  {#if renderMode === 'skeleton'}
    <Skeleton variant={skeleton} />
  {:else if renderMode === 'stream-error'}
    <!-- streamingError banner below carries the message; nothing else to render -->
  {:else if renderMode === 'dashboard'}
    <DashboardRenderer {spec} {onSpecChanged} />
  {:else if renderMode === 'intent'}
    <!--
      Designed intent layout (form / confirm) via IntentRenderer. The flow
      context (if any) lets a confirm step summarize earlier answers. A form/
      confirm step that carries only a raw `ui` tree renders that tree inside the
      layout chrome (raw-ui mode) — the step's flow-verb buttons still work.
    -->
    <IntentRenderer
      {spec}
      context={getFlowContext ? getFlowContext() : undefined}
      {onSpecChanged}
    />
  {:else if renderMode === 'node' && spec.ui}
    <NodeRenderer node={spec.ui} />
  {:else}
    <div class="ripple-empty">No UI definition for intent: {spec.intent}</div>
  {/if}

  {#if streamingError}
    <div class="ripple-stream-error text-xs text-muted-foreground mt-2 opacity-60">
      Stream ended {streamingError.kind}.
    </div>
  {/if}

  <!-- Always-present confirm dialog — surfaces when the dispatcher writes a pending confirm. -->
  <ConfirmDialog />
</div>
{/if}
