<!--
  Ripple.svelte — Main entry point for Ripple UI rendering.
  Updated: 2026-04-16 — Added streaming + skeleton props. When a StreamSpecStore
  is passed via `streaming`, Ripple renders a Skeleton until the first valid
  parse arrives, then switches to the live spec. Existing `spec` prop behavior
  is unchanged when `streaming` is absent.
  Previous update (2026-03-27): Added intent-based routing for dashboard specs.
-->
<script lang="ts">
  import { setContext } from 'svelte';
  import type { UISpec } from './schema/ui-spec.js';
  import type { UniversalSpec } from './schema/universal-spec.js';
  import type { StreamSpecStore } from './streaming/types.js';
  import { createStateManager } from './core/state-manager.svelte.js';
  import { createEventDispatcher, type OnEventCallback } from './core/event-dispatcher.js';
  import { normalizeSpec } from './core/normalizer.js';
  import { getWidget } from './widgets/index.js';
  import NodeRenderer from './components/NodeRenderer.svelte';
  import DashboardRenderer from './intent/DashboardRenderer.svelte';
  import Skeleton from './widgets/display/Skeleton.svelte';
  import type { DashboardSpec } from './intent/dashboard-manager.svelte.js';
  import type { RippleEvent } from './types.js';

  interface Props {
    spec?: UniversalSpec | UISpec | any;
    streaming?: StreamSpecStore;
    skeleton?: 'card' | 'dashboard' | 'text' | 'none';
    state?: Record<string, any>;
    onEvent?: OnEventCallback;
    onSpecChanged?: (spec: DashboardSpec) => void;
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
  const eventDispatcher = createEventDispatcher(stateManager, onEvent);
  let dataStore = $state<Record<string, unknown>>({});

  // Sync external state prop changes into the stateManager reactively.
  // This allows data_sources and other async state updates to flow in
  // after the initial render.
  $effect(() => {
    if (initialStateOverride) {
      for (const [key, value] of Object.entries(initialStateOverride)) {
        if (value !== undefined && value !== stateManager.get(key)) {
          stateManager.set(key, value);
        }
      }
    }
  });

  setContext('ui-state', stateManager);
  setContext('ui-events', eventDispatcher);
  setContext('ui-data', dataStore);
  setContext('ui-widget-resolver', getWidget);

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
</div>
