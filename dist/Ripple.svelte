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
