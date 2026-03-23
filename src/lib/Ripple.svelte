<script lang="ts">
  import { setContext } from 'svelte';
  import type { UISpec } from './schema/ui-spec.js';
  import type { UniversalSpec } from './schema/universal-spec.js';
  import { createStateManager } from './core/state-manager.svelte.js';
  import { createEventDispatcher, type OnEventCallback } from './core/event-dispatcher.js';
  import { normalizeSpec } from './core/normalizer.js';
  import { getWidget } from './widgets/index.js';
  import NodeRenderer from './components/NodeRenderer.svelte';
  import type { RippleEvent } from './types.js';

  interface Props {
    spec: UniversalSpec | UISpec | any;
    state?: Record<string, any>;
    onEvent?: OnEventCallback;
    class?: string;
    style?: string;
  }

  let {
    spec: rawSpec,
    state: initialStateOverride,
    onEvent,
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

  setContext('ui-state', stateManager);
  setContext('ui-events', eventDispatcher);
  setContext('ui-data', dataStore);
  setContext('ui-widget-resolver', getWidget);
</script>

<div
  class="ripple-root {className}"
  {style}
  data-ripple-version={spec.version}
  data-ripple-intent={spec.intent}
>
  {#if spec.ui}
    <NodeRenderer node={spec.ui} />
  {:else}
    <div class="ripple-empty">No UI definition for intent: {spec.intent}</div>
  {/if}
</div>

<style>
  .ripple-root {
    /* Typography */
    --ripple-font-sans: inherit;
    --ripple-font-mono: "JetBrains Mono Variable", "SF Mono", ui-monospace, monospace;

    /* Text hierarchy */
    --ripple-text: rgba(255, 255, 255, 0.85);
    --ripple-text-secondary: rgba(255, 255, 255, 0.62);
    --ripple-text-muted: rgba(255, 255, 255, 0.38);
    --ripple-text-dim: rgba(255, 255, 255, 0.28);

    /* Surfaces */
    --ripple-surface: rgba(255, 255, 255, 0.04);
    --ripple-surface-hover: rgba(255, 255, 255, 0.08);
    --ripple-border: rgba(255, 255, 255, 0.06);
    --ripple-border-subtle: rgba(255, 255, 255, 0.04);
    --ripple-ring: rgba(255, 255, 255, 0.20);

    /* Semantic colors */
    --ripple-success: #30D158;
    --ripple-success-bg: rgba(48, 209, 88, 0.12);
    --ripple-danger: #FF453A;
    --ripple-danger-bg: rgba(255, 69, 58, 0.12);
    --ripple-warning: #FF9F0A;
    --ripple-warning-bg: rgba(255, 159, 10, 0.12);
    --ripple-info: #0A84FF;
    --ripple-info-bg: rgba(10, 132, 255, 0.12);

    width: 100%;
    font-family: var(--ripple-font-sans);
    color: var(--ripple-text-secondary);
    font-size: 11px;
    line-height: 1.4;
  }
</style>
