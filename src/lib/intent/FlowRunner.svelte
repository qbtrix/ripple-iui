<!--
  FlowRunner.svelte — Chain Flow host (RFC 13 M1).
  Created 2026-05-31.
  Updated 2026-06-07 — intent→layout slice: each step now renders inside a polished
  card with a ChainProgress chrome and a ~180ms step transition, instead of a bare
  widget tree. The executor logic, the flow.next/back/forward/submit interception,
  the terminal onComplete hand-off, and the flowHosted recursion guard are ALL
  unchanged — only the per-step CHROME is new. The step's tree still renders via
  the inner `<Ripple flowHosted>` (which routes through IntentRenderer now), so the
  step's flow-verb buttons keep driving the executor. ChainProgress reads
  completed/current/total derived purely from the executor's history + estimated
  total (no new engine state).
  Updated 2026-06-08 (design polish): the card chrome now follows a single
  4/8/12/16/24px spacing scale. Card padding 24px, body gap 16px, header gap 4px,
  title/desc tracking tightened, a hairline divider above the back-nav, and the
  back control restyled as a quiet ghost button (8px radius, 12px inset). The
  success view keeps the centered layout on the same scale. Behavior unchanged —
  CSS only.
  Updated 2026-06-08 (step-content rhythm): the card gap only reaches the card's
  OWN direct children (header / Ripple / nav); the rendered step's blocks live a
  level deeper inside `.ripple-root`, and a bare Container renders them flush —
  the source of the "content too cramped" complaint. We now impose a 16px
  baseline gap on adjacent siblings of the step's `.ripple-root` AND of any bare
  `[data-ripple-container]` inside it. Zero-specificity (`:where()`) so a spec's
  own spacing wins, and containers that already drive layout via flex/grid/gap-*
  are excluded to avoid double-spacing. FLOW-CARD scoped only. CSS only.
  Updated 2026-06-07 (Wave 3 fixes):
    (a) DOUBLE HEADING: showHeader now detects whether the step's ui tree leads with
        a heading node; when it does the flow-runner__header is suppressed so only
        one heading renders per step.
    (b) CHAINPROGRESS ALWAYS VISIBLE: showProgress now includes a check for whether
        the root spec is multi-step (has chain/chain_map), so the dots render even
        at step 1 when total is unknown.
    (c) BARE PILL BUTTONS: select steps now route through IntentRenderer → SelectLayout
        → OptionList (via DESIGNED_INTENTS expansion in Ripple.svelte). FlowRunner
        itself is untouched for this — the routing change is in Ripple + SelectLayout.
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
	import { fly } from 'svelte/transition';
	import Ripple from '../Ripple.svelte';
	import ChainProgress from './ChainProgress.svelte';
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
			executor.reset(spec); // also clears the submitted flag
			seededFor = spec;
		}
	});
	// True once a terminal `flow.submit` fired — drives the in-card success view
	// so finishing gives visible feedback even when the terminal action is an
	// `emit`/no-op the host doesn't surface. Kept on the executor (a .svelte.ts
	// class) so it's reactive without a top-level component `$state` rune.
	const completed = $derived(executor.submitted);

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

	// --- ChainProgress chrome (purely derived from the executor's history) -----
	// `current` is 1-indexed history depth; `total` is the executor's estimate
	// (undefined when a chain_map makes the path dynamic — ChainProgress then
	// shows just the live count). `completedSteps` is every prior history entry,
	// labelled with its selection / form value for the dots tooltips.
	const currentStep = $derived(executor.historyLength);
	const totalSteps = $derived(executor.estimatedTotalSteps);
	// Can step back whenever there's a prior step in history and we're not done.
	const canGoBack = $derived(!completed && executor.historyLength > 1);
	// Heading for the success view: prefer the terminal step's title.
	const completionTitle = $derived(currentSpec.title || 'All done');
	const completedSteps = $derived.by(() => {
		const hist = executor.history;
		if (hist.length <= 1) return [];
		return hist.slice(0, -1).map((entry, i) => {
			const sel = entry.state.selected as Record<string, unknown> | null;
			let value = '';
			if (sel && typeof sel === 'object') {
				value = String(sel.label ?? sel.title ?? sel.name ?? sel.id ?? '');
			} else if (sel != null) {
				value = String(sel);
			} else {
				const fd = entry.state.formData ?? {};
				const firstKey = Object.keys(fd)[0];
				if (firstKey) value = String(fd[firstKey] ?? '');
			}
			return { title: entry.spec.title ?? `Step ${i + 1}`, value };
		});
	});
	// Fix (b): show ChainProgress always when the flow is multi-step, even at step 1
	// when totalSteps is unknown (chain_map branches). We also check the root spec
	// itself (spec, not currentSpec) — the root always has chain/chain_map; once
	// we're past step 1 the current step is terminal-or-next so we can't rely solely
	// on the current step. ChainProgress renders "Step 1" + dots correctly when
	// total is undefined (see ChainProgress.svelte line ~36: totalCount fallback).
	const isMultiStepFlow = $derived(
		!!(spec as Record<string, unknown>).chain ||
		!!(spec as Record<string, unknown>).chain_map
	);
	const showProgress = $derived(
		isMultiStepFlow ||
		currentStep > 1 ||
		(typeof totalSteps === 'number' && totalSteps > 1)
	);

	// Fix (a): detect when the current step's ui tree leads with a heading node.
	// When it does, the step already has its own visible heading and we must suppress
	// the flow-runner__header so only one heading renders per step.
	function uiLeadsWithHeading(s: UniversalSpec): boolean {
		const ui = (s as Record<string, unknown>).ui as Record<string, unknown> | undefined;
		if (!ui) return false;
		if (ui.type === 'heading') return true;
		const children = ui.children;
		if (Array.isArray(children) && children.length > 0) {
			const first = children[0] as Record<string, unknown> | undefined;
			return first?.type === 'heading';
		}
		return false;
	}
	// Suppress the FlowRunner title block when the step's own ui leads with a heading.
	const showHeader = $derived(
		!!currentSpec.title && !uiLeadsWithHeading(currentSpec)
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
		// Show the success view first so the user always gets feedback, then hand
		// the terminal action off to the host (navigate/emit/chat) exactly as before.
		executor.markSubmitted();
		const terminal = executor.terminalAction();
		if (terminal) onComplete?.(terminal);
	}

	function goBack(): void {
		executor.back();
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
	{#if showProgress}
		<ChainProgress steps={completedSteps} current={currentStep} total={totalSteps} />
	{/if}

	{#if completed}
		<!-- Terminal success view: visible feedback after a flow.submit, shown
		     regardless of the host action kind (emit/navigate/chat/no-op). The
		     host action already fired in fireTerminal(). -->
		<div class="flow-runner__card flow-runner__done" role="status" aria-live="polite">
			<div class="flow-runner__check" aria-hidden="true">✓</div>
			<h2 class="flow-runner__title">{completionTitle}</h2>
			<p class="flow-runner__desc">You're all set.</p>
		</div>
	{:else}
	{#key stepKey}
		<!--
		  The step is wrapped in a themed card with a short fly transition so a step
		  change feels like a smooth advance, not a hard swap. `{#key stepKey}`
		  remounts the card per step (a fresh StateManager + handlers — see stepKey
		  note above), which also re-triggers the transition.

		  flowHosted={true} is the recursion guard: a non-terminal step still
		  carries its onward chain/chain_map, so the base <Ripple>'s flow
		  auto-detection would otherwise mount a nested FlowRunner here. The flag
		  makes this inner Ripple render just the step's node tree (now routed
		  through IntentRenderer → designed layout).
		-->
		<div class="flow-runner__card" in:fly={{ x: 16, duration: 180 }}>
			{#if showHeader}
				<div class="flow-runner__header">
					<h2 class="flow-runner__title">{currentSpec.title}</h2>
					{#if currentSpec.description}
						<p class="flow-runner__desc">{currentSpec.description}</p>
					{/if}
				</div>
			{/if}
			<Ripple spec={currentSpec} {state} onEvent={handleEvent} flowHosted={true} />
			{#if canGoBack}
				<div class="flow-runner__nav">
					<button type="button" class="flow-runner__back" onclick={goBack}>
						<span aria-hidden="true">←</span> Back
					</button>
				</div>
			{/if}
		</div>
	{/key}
	{/if}
</div>

<style>
	/* Spacing scale: 4 / 8 / 12 / 16 / 24 px. */
	.flow-runner {
		display: flex;
		flex-direction: column;
		gap: 0.75rem; /* 12px between progress chrome and the card */
	}

	.flow-runner__card {
		display: flex;
		flex-direction: column;
		gap: 1rem; /* 16px between header / body / actions */
		padding: 1.5rem; /* 24px */
		border-radius: var(--ripple-radius);
		border: 1px solid var(--ripple-border);
		background: var(--ripple-surface);
		color: var(--ripple-surface-foreground);
		box-shadow:
			0 1px 2px rgb(0 0 0 / 0.04),
			0 4px 12px rgb(0 0 0 / 0.05);
	}

	/* Baseline vertical rhythm for the rendered STEP content. The flow-card gap
	   only reaches the card's own direct children (header / Ripple / nav); the
	   step's blocks live one level deeper inside `.ripple-root` and a bare
	   Container (`[data-ripple-container]`) renders its children flush. We give
	   adjacent siblings — both the ripple-root's own children and a bare
	   container's children — a 16px baseline gap. Scoped to the FLOW CARD only,
	   so no other surface is touched.

	   Safety: `:where()` keeps specificity at 0, so a spec that sets its own
	   spacing still wins on source order. We also EXCLUDE any container that
	   declares flex / grid / gap-* (where the spec is already driving layout
	   via `gap`, so a margin would double up). A lone child (`+`) gets nothing. */
	.flow-runner__card :global(.ripple-root) {
		display: flex;
		flex-direction: column;
	}
	.flow-runner__card :global(:where(.ripple-root) > * + *) {
		margin-top: 1rem; /* 16px */
	}
	.flow-runner__card
		:global(
			:where(
					.ripple-root
						[data-ripple-container]:not([class*='flex']):not([class*='grid']):not(
							[class*='gap-']
						)
				)
				> * + *
		) {
		margin-top: 1rem; /* 16px */
	}

	.flow-runner__header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem; /* 4px */
	}

	.flow-runner__title {
		margin: 0;
		font-size: 1.125rem; /* 18px */
		font-weight: 600;
		line-height: 1.3;
		letter-spacing: -0.011em;
	}

	.flow-runner__desc {
		margin: 0;
		font-size: 0.875rem; /* 14px */
		line-height: 1.45;
		color: var(--ripple-muted-foreground);
	}

	/* Back nav — sits under the step body, set off by a hairline divider. */
	.flow-runner__nav {
		display: flex;
		justify-content: flex-start;
		margin-top: 0.25rem; /* 4px beyond the 16px body gap */
		padding-top: 1rem; /* 16px */
		border-top: 1px solid var(--ripple-border);
	}

	.flow-runner__back {
		appearance: none;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem; /* 6px */
		background: transparent;
		border: none;
		padding: 0.375rem 0.75rem; /* 6px / 12px */
		margin-left: -0.75rem; /* keep the label optically aligned to the card edge */
		font-size: 0.875rem; /* 14px */
		font-weight: 500;
		color: var(--ripple-muted-foreground);
		cursor: pointer;
		border-radius: 0.5rem; /* 8px */
		transition:
			color 150ms ease-out,
			background-color 150ms ease-out;
	}

	.flow-runner__back:hover {
		color: var(--ripple-surface-foreground);
		background: var(--ripple-muted);
	}

	.flow-runner__back:focus-visible {
		outline: 2px solid var(--ripple-ring);
		outline-offset: 2px;
	}

	/* Terminal success view. */
	.flow-runner__done {
		align-items: center;
		text-align: center;
		gap: 0.75rem; /* 12px */
		padding: 2rem 1.5rem; /* 32px / 24px */
	}

	.flow-runner__check {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 9999px;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--ripple-success-foreground, #fff);
		background: var(--ripple-success, oklch(0.72 0.17 155));
		box-shadow: 0 2px 8px color-mix(in oklch, var(--ripple-success, oklch(0.72 0.17 155)) 35%, transparent);
	}
</style>
