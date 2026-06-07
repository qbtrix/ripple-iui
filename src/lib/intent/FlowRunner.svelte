<!--
  FlowRunner.svelte — Chain Flow host (RFC 13 M1).
  Created 2026-05-31.
  Updated 2026-06-07 — VISUAL SHELL: added a polished multistep "stepper shell"
  around the (unchanged) per-step <Ripple> render — a themed card (rounded border,
  surface bg, elevation shadow, padding), a progress row (dots + "Step N of M"),
  a step header from currentSpec.title, and a fast fade/slide transition on step
  change. Purely additive chrome: props, onEvent/event wiring, the inner
  `<Ripple ... flowHosted={true}>` mount, the recursion guard, state threading,
  and terminal behavior are all untouched. Progress total is derived honestly:
  estimatedTotalSteps for a linear path; on a chain_map branch (remainder
  unknowable) it degrades to "Step N" with completed+current dots and no fake
  total. Styling uses ripple's --ripple-* / --elevation-* tokens (scoped <style>,
  not Tailwind utilities — scoped Svelte CSS compiles reliably).
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

	// --- Visual shell: progress + header ------------------------------------
	// The step we're on (1-based) = history depth. Completed steps = depth - 1.
	const currentStepNo = $derived(executor.historyLength);

	// Honest total: estimatedTotalSteps walks the LINEAR chain and returns
	// undefined the moment a chain_map sits on the path (the remainder is
	// genuinely unknowable). One refinement: if we're already at the terminal
	// step, the total IS knowable now — it's exactly the steps we've taken.
	const totalSteps = $derived(
		executor.isTerminal ? currentStepNo : executor.estimatedTotalSteps
	);

	// Dots to render. When the total is known we draw `totalSteps` dots
	// (completed = filled, current = active, future = hollow). When it's
	// unknown (mid-flow on a chain_map branch) we draw only the steps we know
	// about — completed + current — and the label degrades to "Step N" with no
	// fabricated total.
	const dotCount = $derived(totalSteps ?? currentStepNo);
	const dots = $derived(
		Array.from({ length: dotCount }, (_, i) => {
			const n = i + 1;
			if (n < currentStepNo) return 'done';
			if (n === currentStepNo) return 'current';
			return 'future';
		})
	);

	// Step header text. Prefer the spec's title; the step's own template may
	// also carry a heading widget — the shell header is the primary, so we keep
	// it concise and let the inner heading act as secondary copy. Falls back to
	// nothing rather than echoing an intent slug as a fake title.
	const stepTitle = $derived(currentSpec.title ?? '');

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

<div
	class="flow-runner {className}"
	data-flow-step={currentSpec.flowId ?? currentSpec.id ?? currentSpec.intent}
>
	<div class="flow-card">
		<!-- Progress: dots + "Step N of M" (or "Step N" when total unknowable). -->
		<header class="flow-progress">
			<div class="flow-dots" role="presentation" aria-hidden="true">
				{#each dots as kind}
					<span class="flow-dot" data-state={kind}></span>
				{/each}
			</div>
			<span class="flow-count">
				{#if totalSteps}
					Step {currentStepNo} of {totalSteps}
				{:else}
					Step {currentStepNo}
				{/if}
			</span>
		</header>

		<!-- Step header from the spec title (primary heading for the step). -->
		{#if stepTitle}
			<h2 class="flow-step-title">{stepTitle}</h2>
		{/if}

		<!-- Step body: fades/slides in on each step change (keyed remount). -->
		<div class="flow-body">
			{#key stepKey}
				<div class="flow-step">
					<!--
					  flowHosted={true} is the recursion guard: a non-terminal step still
					  carries its onward chain/chain_map, so the base <Ripple>'s flow
					  auto-detection would otherwise mount a nested FlowRunner here. The
					  flag makes this inner Ripple render just the step's node tree.
					-->
					<Ripple spec={currentSpec} {state} onEvent={handleEvent} flowHosted={true} />
				</div>
			{/key}
		</div>
	</div>
</div>

<style>
	.flow-runner {
		display: block;
		width: 100%;
	}

	/* The card: rounded, bordered, elevated surface — themed via ripple tokens. */
	.flow-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		background: var(--ripple-surface, #fff);
		color: var(--ripple-surface-foreground, inherit);
		border: 1px solid var(--ripple-border, rgba(0, 0, 0, 0.1));
		border-radius: calc(var(--ripple-radius, 0.5rem) + 0.25rem);
		box-shadow: var(--elevation-shadow-4, 0 6px 16px rgba(0, 0, 0, 0.12));
	}

	/* Progress row: dots on the left, count on the right. */
	.flow-progress {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.flow-dots {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.flow-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--ripple-border, rgba(0, 0, 0, 0.15));
		transition:
			background-color 0.2s ease,
			transform 0.2s ease,
			width 0.2s ease;
	}

	.flow-dot[data-state='done'] {
		background: var(--ripple-accent, #4f46e5);
		opacity: 0.55;
	}

	.flow-dot[data-state='current'] {
		background: var(--ripple-accent, #4f46e5);
		/* Elongate the active dot into a pill so the current step reads clearly. */
		width: 1.25rem;
	}

	.flow-count {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--ripple-muted-foreground, rgba(0, 0, 0, 0.55));
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.flow-step-title {
		margin: 0;
		font-size: 1.25rem;
		line-height: 1.3;
		font-weight: 650;
		letter-spacing: -0.01em;
		color: var(--ripple-surface-foreground, inherit);
	}

	/* Body wrapper keeps layout stable while the keyed step transitions in. */
	.flow-body {
		display: grid;
	}

	.flow-step {
		grid-area: 1 / 1;
		min-width: 0;
		/* Each step is a fresh element (keyed remount), so this fires per step
		   change. Pure CSS — no Web Animations API, so it stays jsdom-safe and
		   SSR-safe (no element.animate, unlike Svelte's JS transitions). */
		animation: flow-step-in 180ms cubic-bezier(0.33, 1, 0.68, 1) both;
	}

	@keyframes flow-step-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.flow-dot {
			transition: none;
		}
		.flow-step {
			animation: none;
		}
	}
</style>
