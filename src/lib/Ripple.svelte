<!--
  Ripple.svelte — Main entry point for Ripple UI rendering.
  Updated: 2026-04-21 — Flow actions wiring: instantiate a per-instance
  WidgetRegistry, expose via 'ui-widget-registry' context, thread to the
  EventDispatcher, and auto-mount the ConfirmDialog overlay so any confirm
  action surfaces without extra spec.
  Previous (2026-04-16): Added streaming + skeleton props. When a StreamSpecStore
  is passed via `streaming`, Ripple renders a Skeleton until the first valid
  parse arrives, then switches to the live spec.
-->
<script lang="ts">
  import { setContext } from 'svelte';
  import type { UISpec } from './schema/ui-spec.js';
  import type { UniversalSpec } from './schema/universal-spec.js';
  import type { StreamSpecStore } from './streaming/types.js';
  import { createStateManager } from './core/state-manager.svelte.js';
  import { createEventDispatcher, type OnEventCallback } from './core/event-dispatcher.js';
  import { createWidgetRegistry } from './core/widget-registry.js';
  import { createToastBus, type ToastVariant } from './core/toast-bus.svelte.js';
  import { normalizeSpec } from './core/normalizer.js';
  import { getWidget } from './widgets/index.js';
  import NodeRenderer from './components/NodeRenderer.svelte';
  import DashboardRenderer from './intent/DashboardRenderer.svelte';
  import Skeleton from './widgets/display/Skeleton.svelte';
  import ConfirmDialog from './widgets/overlay/ConfirmDialog.svelte';
  import type { DashboardSpec } from './intent/dashboard-manager.svelte.js';
  import type { RippleEvent } from './types.js';

  interface Props {
    spec?: UniversalSpec | UISpec | any;
    streaming?: StreamSpecStore;
    skeleton?: 'card' | 'dashboard' | 'text' | 'none';
    state?: Record<string, any>;
    onEvent?: OnEventCallback;
    onSpecChanged?: (spec: DashboardSpec) => void;
    onStateChange?: (path: string, value: unknown, state: Record<string, unknown>) => void;
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
    class: className = '',
    style
  }: Props = $props();

  const resolvedSpec = $derived(streaming?.current ?? rawSpec);
  const spec = $derived(normalizeSpec(resolvedSpec));

  const mergedInitialState = $derived({
    ...((spec as any).state ?? {}),
    ...(initialStateOverride ?? {})
  });

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

  const eventDispatcher = createEventDispatcher(stateManager, chainedOnEvent, widgetRegistry);
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
  setContext('ui-host-event', onEvent);
  setContext('ui-toasts', toastBus);

  $effect(() => {
    if (!onStateChange) return;
    return stateManager.subscribe(onStateChange);
  });

  let renderMode = $derived.by((): 'dashboard' | 'node' | 'empty' | 'skeleton' | 'stream-error' => {
    if (streaming && streaming.done && streaming.error && streaming.current == null) {
      return 'stream-error';
    }
    if (streaming && streaming.current == null && !streaming.done) return 'skeleton';
    if (spec.intent === 'dashboard') return 'dashboard';
    if (spec.ui) return 'node';
    return 'empty';
  });

  const streamingError = $derived(streaming?.error ?? null);
</script>

<div
  class="ripple-root {className}"
  {style}
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
