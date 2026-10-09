<!--
  Ripple.svelte: the main entry point. Takes a spec (or a `streaming` store from
  streamSpec()), normalizes it, and renders it with its own StateManager,
  EventDispatcher, widget registry, toast bus and ConfirmDialog.

  - Routing: a chain spec (isFlowSpec) is hosted in a FlowRunner unless
    `flowHosted` is set (FlowRunner's per-step inner Ripple sets it, so a step is
    never re-detected as a flow). Otherwise designed intents (form, confirm,
    slides, ...) go to IntentRenderer, dashboards to DashboardRenderer, and
    `custom` / unmapped intents to NodeRenderer.
  - Streaming: a Skeleton shows until the first valid parse; a stream error with
    no parse renders only the error line. 'ui-streaming' is a getter that is true
    while this Ripple's stream, or an enclosing one, is still arriving (a flow
    step's inner Ripple inherits it), so layouts can hold back half-read nodes.
  - State: seeded once from spec.state + the `state` prop. Later spec.state
    changes sync key by key against a private copy of what the spec last said.
    A flow spec seeds this store the same way and hands it to FlowRunner, and
    every step's inner Ripple (flowHosted) reuses it through 'ui-flow-state',
    so bound values carry across steps; a step's own `state` only fills keys
    the store does not have yet.
    Live state and that copy never share objects with the spec (a streamed spec
    is the stream store's $state proxy), or a user write would read as a spec
    change and be reverted.
  - spec.theme and the `brand` pack become CSS vars on the root; `animate`
    finds its target inside this root only.
  - Opt-ins: `checkCatalog` warns on out-of-catalog node types (never blocks);
    `ensureIds` fills missing node ids once per `ui` root without mutating the
    caller's spec.
-->
<script lang="ts">
  import { setContext, getContext } from 'svelte';
  import {
		createEventDispatcher,
		createWidgetRegistry,
		normalizeSpec,
		themeToStyleString,
		brandToStyleString,
		validateCatalog,
		isFlowSpec,
		unwrapFlowRoot,
		ensureNodeIds,
		type UISpec,
		type UniversalSpec,
		type OnEventCallback,
		type UINode,
		type BrandPack,
		type RippleEvent
  } from '@ripple-ui/core';
  import type { StreamSpecStore } from './streaming/types.js';
  import { createStateManager, type StateManager } from './core/state-manager.svelte.js';
  import { createToastBus, type ToastVariant } from './core/toast-bus.svelte.js';
  import { getWidget } from './widgets/index.js';
  import NodeRenderer from './components/NodeRenderer.svelte';
  import DashboardRenderer from './intent/DashboardRenderer.svelte';
  import IntentRenderer from './intent/IntentRenderer.svelte';
  import FlowRunner from './intent/FlowRunner.svelte';
  import Skeleton from './widgets/display/Skeleton.svelte';
  import ConfirmDialog from './widgets/overlay/ConfirmDialog.svelte';
  import type { DashboardSpec } from './intent/dashboard-manager.svelte.js';
  import type { TerminalResult } from './intent/chain-executor.svelte.js';

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
    /**
     * SP-3 design system. A portable BrandPack whose tokens are emitted as CSS
     * custom properties on the ripple-root, re-skinning the whole spec at once.
     * Absent or token-less brand emits nothing (today's look — no regression).
     * Precedence on the root: spec.theme overrides brand; brand overrides the
     * host `style`; an explicit per-widget prop still wins over all of them.
     */
    brand?: BrandPack;
    /** Which brand color slot to apply (inline CSS vars can't react to `.dark`). */
    brandMode?: 'light' | 'dark';
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
    brand,
    brandMode = 'light',
    class: className = '',
    style
  }: Props = $props();

  const resolvedSpec = $derived(streaming?.current ?? rawSpec);
  const spec = $derived(normalizeSpec(resolvedSpec));

  // White-label keystone (RFC 12): emit spec.theme as CSS custom properties on
  // the ripple-root so a host's brand applies with no per-site CSS authoring.
  const themeStyle = $derived(themeToStyleString((spec as { theme?: unknown }).theme as never));

  // SP-3 design system: emit the BrandPack's tokens as CSS vars on the ripple-root.
  // Placed BEFORE themeStyle in the style string (later wins) so spec.theme
  // overrides brand, and after the host `style` so brand overrides ad-hoc host CSS.
  const brandStyle = $derived(brandToStyleString(brand, { mode: brandMode }));

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

  // A flow step shares its FlowRunner's store (the outer Ripple's) instead of
  // seeding a fresh one, so a value bound in step 1 is still there in step 2.
  // svelte-ignore state_referenced_locally
  const flowStore = flowHosted ? getContext<StateManager | undefined>('ui-flow-state') : undefined;
  // svelte-ignore state_referenced_locally
  const stateManager = flowStore ?? createStateManager(mergedInitialState);
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
  // `playMotion` is injected, not imported by the engine: it is a Svelte
  // action and @ripple-ui/core must not reach into a renderer. Lazily loaded
  // so the animation engine still stays out of the initial bundle and off the
  // SSR pass, exactly as the old dispatcher-side dynamic import did.
  const eventDispatcher = createEventDispatcher(
    stateManager,
    chainedOnEvent,
    widgetRegistry,
    () => rootEl,
    (node, motion) =>
      import('./actions/with-motion.js').then(({ playMotion }) => {
        playMotion(node, motion as never);
      })
  );
  let dataStore = $state<Record<string, unknown>>({});

  // `spec.data` remote fetchers were removed from the schema: nothing ever ran
  // them, so a declared fetcher silently resolved to nothing and the widget
  // rendered empty. Warn once instead of leaving the author to debug it.
  // `sources` (RFC 04, server-executed) is the live remote-data path.
  let warnedLegacyDataFetcher = false;
  function looksLikeRemoteFetcher(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    if ('url' in obj) return true;
    return Object.values(obj).some(
      (v) => !!v && typeof v === 'object' && 'url' in (v as Record<string, unknown>)
    );
  }
  $effect(() => {
    if (warnedLegacyDataFetcher) return;
    // Gen-2 UniversalSpec never had fetchers and its inline `data` is live,
    // consumed content — a `{ url, title }` payload there is data, not a
    // legacy fetcher. `intent` is required on Gen-2 and absent on Gen-1, so
    // it's a clean discriminator.
    if (rawSpec && typeof rawSpec === 'object' && 'intent' in rawSpec) return;
    if (looksLikeRemoteFetcher((rawSpec as { data?: unknown } | undefined)?.data)) {
      warnedLegacyDataFetcher = true;
      console.warn(
        '[ripple] `spec.data` remote fetchers are never executed and have been removed ' +
          'from the schema. Use `sources` (server-executed) instead.'
      );
    }
  });

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
  // specs, streamed chunks) need to flow into the live stateManager too.
  // Track the last-synced snapshot and push only deltas, so a user typing
  // into a `{state.draft}`-bound input doesn't get clobbered on every
  // re-render: their write touches stateManager but never spec.state, so
  // the diff stays empty for that key.
  // Both the live write and the tracker take a $state.snapshot copy. A
  // streamed spec is the stream store's $state proxy; installing it as-is
  // made live state, the tracker and the spec one object, so a user write
  // changed the tracker too, the next (pristine) parse looked like a spec
  // change, and the write was reverted.
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
      // On the shared flow store a step's own `state` is a default: it never
      // overwrites what an earlier step, or this step before a Back, left there.
      if (flowStore && stateManager.get(key) !== undefined) continue;
      // initialStateOverride wins on conflict — preserve the host's
      // API-data precedence from `mergedInitialState`.
      if (overrideKeys && overrideKeys.has(key)) continue;
      if (!shallowDifferent(value, lastSyncedSpecState[key])) continue;
      if (shallowDifferent(value, stateManager.get(key))) {
        stateManager.set(key, $state.snapshot(value));
      }
      lastSyncedSpecState[key] = $state.snapshot(value);
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
  const parentStreaming = getContext<(() => boolean) | undefined>('ui-streaming');
  setContext('ui-streaming', () => (streaming ? !streaming.done : false) || parentStreaming?.() === true);

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
    'slides', // SP-4: presentation deck → IntentRenderer → SlidesLayout
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
    completion forwards to this component's `onComplete`. The runner gets this
    component's store (seeded from spec.state + the `state` prop) so every step
    starts from the card's own state. This branch replaces
    the normal `.ripple-root` tree entirely; the non-flow path below is
    untouched (byte-identical output for plain specs).
  -->
  <FlowRunner spec={flowRoot} {onComplete} {onEvent} store={stateManager} class={className} />
{:else}
<div
  bind:this={rootEl}
  class="ripple-root {className}"
  style={[style, brandStyle, themeStyle].filter(Boolean).join('; ')}
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
