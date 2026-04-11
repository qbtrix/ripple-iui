<!--
  Ripple.svelte — Main entry point for Ripple UI rendering.
  Updated: 2026-03-27 — Added intent-based routing: specs with intent='dashboard'
  route to DashboardRenderer. Specs with intent='custom' or raw UISpec use NodeRenderer.
  Other intents will route through the layout engine as more layouts are added.
-->
<script lang="ts">
  import { setContext } from 'svelte';
  import type { UISpec } from './schema/ui-spec.js';
  import type { UniversalSpec } from './schema/universal-spec.js';
  import { createStateManager } from './core/state-manager.svelte.js';
  import { createEventDispatcher, type OnEventCallback } from './core/event-dispatcher.js';
  import { normalizeSpec } from './core/normalizer.js';
  import { getWidget } from './widgets/index.js';
  import NodeRenderer from './components/NodeRenderer.svelte';
  import DashboardRenderer from './intent/DashboardRenderer.svelte';
  import type { DashboardSpec } from './intent/dashboard-manager.svelte.js';
  import type { RippleEvent } from './types.js';

  interface Props {
    spec: UniversalSpec | UISpec | any;
    state?: Record<string, any>;
    onEvent?: OnEventCallback;
    onSpecChanged?: (spec: DashboardSpec) => void;
    class?: string;
    style?: string;
  }

  let {
    spec: rawSpec,
    state: initialStateOverride,
    onEvent,
    onSpecChanged,
    class: className = '',
    style
  }: Props = $props();

  const spec = $derived(normalizeSpec(rawSpec));

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

  // Determine rendering path based on intent
  let renderMode = $derived.by((): 'dashboard' | 'node' | 'empty' => {
    if (spec.intent === 'dashboard') return 'dashboard';
    if (spec.ui) return 'node';
    return 'empty';
  });
</script>

<div
  class="ripple-root {className}"
  {style}
  data-ripple-version={spec.version}
  data-ripple-intent={spec.intent}
>
  {#if renderMode === 'dashboard'}
    <DashboardRenderer {spec} {onSpecChanged} />
  {:else if renderMode === 'node' && spec.ui}
    <NodeRenderer node={spec.ui} />
  {:else}
    <div class="ripple-empty">No UI definition for intent: {spec.intent}</div>
  {/if}
</div>
