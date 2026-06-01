<!--
  FlowRunner.svelte — Chain Flow host (RFC 13 M1).
  Created 2026-05-31.
  Updated 2026-05-31 — RECURSION GUARD: the per-step inner `<Ripple>` now mounts
  with `flowHosted={true}`. Now that the base `<Ripple>` auto-detects chain specs
  (PR #49 every-surface fix), a non-terminal step still carries its onward
  `chain`/`chain_map`, so without this flag the inner Ripple would re-detect the
  step as a flow and nest a SECOND FlowRunner — infinite recursion / hang. The
  flag makes the inner Ripple skip detection and render just that step's tree.

  Drives a `ChainExecutor` over a nested `chain`/`chain_map` `UniversalSpec`
  tree and renders the current step with the standard `<Ripple>` renderer, so a
  multi-step flow runs ENTIRELY CLIENT-SIDE with zero round-trips. This is the
  "renders in a Pocket first" deliverable for M1 — no chat dependency, no inline
  wiring (that is M2), no commerce.

  How a step talks to the runner: a step's UI uses the standard `emit` action
  with the flow verb as its `target`, e.g.
    { action: 'emit', target: 'flow.next',
      value: { selection: {...}, formData: {...} } }
  The dispatcher turns that into a `{ type:'emit', name:'flow.next', payload }`
  RippleEvent, which this runner intercepts by its `name`. The verbs are
  deliberately unambiguous and do NOT collide with the action VM's `flow` verb
  (which sequences actions *within* a step — see ChainExecutor's class note):
    - `flow.next`    payload { selection?, formData?, idField? } -> advance(...)
    - `flow.back`                                                -> back()
    - `flow.forward`                                             -> forward()
    - `flow.submit`  payload { selection?, formData?, idField? } -> advance, then
        if the step was terminal, fire the step's `onComplete` FlowAction.
  Any other event (including plain emits) is forwarded to the host `onEvent`.

  Cross-step pre-fill: the runner exposes the executor's accumulated `context`
  via the `ui-flow-context` Svelte context, which NodeRenderer layers onto the
  `state` scope. A later step pre-fills from an earlier one with
  `{state.<flowId>_selection.field}` — a scope addition, not a new engine.
-->
<script lang="ts">
	import { setContext, untrack } from 'svelte';
	import Ripple from '../Ripple.svelte';
	import { ChainExecutor, type TerminalResult } from './chain-executor.svelte.js';
	import type { UniversalSpec } from '../schema/universal-spec.js';
	import type { OnEventCallback } from '../core/event-dispatcher.js';
	import type { RippleEvent } from '../types.js';

	interface Props {
		/** The root flow spec — the whole nested chain/chain_map tree. */
		spec: UniversalSpec;
		/**
		 * Fired at a terminal step with the step's declared FlowAction (if any)
		 * and the full accumulated, namespaced payload. The host runs the action
		 * (navigate / emit / chat); FlowRunner intentionally does not navigate or
		 * call back to an agent itself — that wiring is the host's concern (M2).
		 */
		onComplete?: (result: TerminalResult) => void;
		/** Forwarded non-flow events from the rendered step's `<Ripple>`. */
		onEvent?: OnEventCallback;
		/** Optional initial state passed through to each step's `<Ripple>`. */
		state?: Record<string, unknown>;
		class?: string;
	}

	let { spec, onComplete, onEvent, state, class: className = '' }: Props = $props();

	// One executor per root spec. Re-seed if the root spec identity changes.
	const executor = new ChainExecutor(spec);
	let seededFor = spec;
	$effect(() => {
		if (spec !== untrack(() => seededFor)) {
			executor.reset(spec);
			seededFor = spec;
		}
	});

	// Expose the accumulated flow context to NodeRenderer's resolver as a getter
	// so `{state.<flowId>_selection.field}` resolves and stays reactive.
	setContext('ui-flow-context', () => executor.context);

	const currentSpec = $derived(executor.currentSpec ?? spec);

	// A per-step key. Each step must mount a FRESH <Ripple> (its own StateManager
	// and event handlers); reusing one instance across steps leaves the previous
	// step's click handlers live, so a button on step N can fire step N-1's
	// handler. The history length is monotonic per advance and distinguishes even
	// two steps that share a flowId (e.g. reached via back/forward).
	const stepKey = $derived(
		`${executor.historyLength}:${currentSpec.flowId ?? currentSpec.id ?? currentSpec.intent}`
	);

	const FLOW_VERBS = new Set(['flow.next', 'flow.back', 'flow.forward', 'flow.submit']);

	/** Extract a flow verb from an event, whether raw or emit-wrapped. */
	function flowVerb(event: RippleEvent): string | null {
		// Standard path: `{ action:'emit', target:'flow.next' }` -> name='flow.next'.
		const name = (event as { name?: string }).name;
		if (name && FLOW_VERBS.has(name)) return name;
		// Tolerate a host that pre-routes the verb onto `type` directly.
		const type = (event as { type?: string }).type ?? '';
		if (FLOW_VERBS.has(type)) return type;
		return null;
	}

	function fireTerminal(): void {
		const terminal = executor.terminalAction();
		if (terminal) onComplete?.(terminal);
	}

	const handleEvent: OnEventCallback = (event) => {
		const verb = flowVerb(event);
		if (!verb) {
			// Not a flow verb — hand it straight to the host (preserving its
			// async result so `api` continuations still chain).
			return onEvent?.(event);
		}

		// The advance args ride in `payload` for an emit-wrapped event; fall back
		// to the event itself for a pre-routed one.
		const args = ((event as { payload?: unknown }).payload ?? event) as {
			selection?: unknown;
			formData?: Record<string, unknown>;
			idField?: string;
		};

		switch (verb) {
			case 'flow.next':
				// flow.next only moves forward; terminal completion is flow.submit.
				executor.advance(args.selection, args.formData ?? {}, args.idField);
				return;
			case 'flow.back':
				executor.back();
				return;
			case 'flow.forward':
				executor.forward();
				return;
			case 'flow.submit': {
				// Advance once (records this step's data), then fire onComplete if
				// the step we were on was terminal (advance returned null).
				const next = executor.advance(args.selection, args.formData ?? {}, args.idField);
				if (next === null) fireTerminal();
				return;
			}
		}
	};
</script>

<div class="flow-runner {className}" data-flow-step={currentSpec.flowId ?? currentSpec.id ?? currentSpec.intent}>
	{#key stepKey}
		<!--
		  flowHosted={true} is the recursion guard: a non-terminal step still
		  carries its onward chain/chain_map, so the base <Ripple>'s flow
		  auto-detection would otherwise mount a nested FlowRunner here. The flag
		  makes this inner Ripple render just the step's node tree.
		-->
		<Ripple spec={currentSpec} {state} onEvent={handleEvent} flowHosted={true} />
	{/key}
</div>
