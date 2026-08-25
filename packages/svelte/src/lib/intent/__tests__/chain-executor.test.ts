// chain-executor.test.ts — Unit tests for the Chain Flow step-sequencer (RFC 13 M1).
// Created 2026-05-31.
// Updated 2026-06-17 (fix/flow-required-validation) — added a
//   "required-field validation at advance time" describe block. It reproduces
//   the reported chain-flow v2 bug (Continue with empty required fields advanced
//   anyway) at the executor level: advance() with a required form field left
//   empty/whitespace must NOT push the next step, must surface a per-field error
//   on `validationErrors`, and must leave history unchanged; advance() with every
//   required field filled clears the errors and advances as before.
//
// Ports the still-applicable cases from the genesis prototype's
// chain-executor.test.ts (retyped from IntentSpec to ripple's UniversalSpec),
// then adds RFC 13 coverage: flowId-keyed context, chain_map branching,
// context accumulation, onComplete / terminalAction, the depth + loop guards,
// and back/forward navigation.
import { describe, it, expect, beforeEach } from 'vitest';
import { ChainExecutor, MAX_HISTORY_DEPTH } from '../chain-executor.svelte.js';
import type { UniversalSpec } from '@ripple-ui/core';

// Minimal helper — UniversalSpec requires `intent`; everything else optional.
function step(overrides: Partial<UniversalSpec> & { intent: UniversalSpec['intent'] }): UniversalSpec {
	return { version: '2.0', ...overrides } as UniversalSpec;
}

describe('ChainExecutor — ported genesis cases', () => {
	let executor: ChainExecutor;

	const step1: UniversalSpec = step({
		id: 'step1',
		intent: 'select',
		title: 'Step 1',
		chain_map: {
			'option-a': step({ id: 'step2a', intent: 'form', title: 'Step 2A' }),
			'option-b': step({ id: 'step2b', intent: 'form', title: 'Step 2B' })
		}
	});

	beforeEach(() => {
		executor = new ChainExecutor(step1);
	});

	it('initializes with the root spec', () => {
		// `$state` wraps the stored spec in a Svelte proxy, so assert on a stable
		// field rather than object identity (`toBe`) — the proxy is a different
		// reference from the raw input even though the content is identical.
		expect(executor.currentSpec?.id).toBe('step1');
		expect(executor.currentSpec?.title).toBe('Step 1');
		expect(executor.canGoBack).toBe(false);
		expect(executor.historyLength).toBe(1);
	});

	it('advances based on selection (chain_map)', () => {
		const next = executor.advance({ id: 'option-a' }, {});
		expect(next).toBeDefined();
		expect(next?.title).toBe('Step 2A');
		expect(executor.currentSpec?.title).toBe('Step 2A');
		expect(executor.canGoBack).toBe(true);
		expect(executor.historyLength).toBe(2);
	});

	it('routes to a different branch for a different selection', () => {
		const next = executor.advance({ id: 'option-b' }, {});
		expect(next?.title).toBe('Step 2B');
	});

	it('persists state in context when advancing', () => {
		const selection = { id: 'option-a', name: 'First Choice' };
		const formData = { field1: 'value1' };
		executor.advance(selection, formData);

		const context = executor.getAccumulatedContext();
		expect(context['step1_selection']).toEqual(selection);
		expect(context['step1_formData']).toEqual(formData);
	});

	it('navigates back and restores state', () => {
		const selection = { id: 'option-a', name: 'First Choice' };
		const formData = { field1: 'value1' };
		executor.advance(selection, formData);
		expect(executor.currentSpec?.title).toBe('Step 2A');

		const prev = executor.back();
		expect(prev?.spec.title).toBe('Step 1');
		expect(prev?.state.selected).toEqual(selection);
		expect(prev?.state.formData).toEqual(formData);
		expect(executor.canGoBack).toBe(false);
	});

	it('uses a custom id field for chain_map lookup', () => {
		const custom = step({
			id: 'custom_id_step',
			intent: 'select',
			title: 'Custom ID Step',
			chain_map: { 'custom-value': step({ intent: 'info', title: 'Matched!' }) }
		});
		executor.reset(custom);
		const next = executor.advance({ customId: 'custom-value' }, {}, 'customId');
		expect(next?.title).toBe('Matched!');
	});

	it('resets history and context', () => {
		executor.advance({ id: 'option-a' }, { field: 'test' });
		const newRoot = step({ intent: 'info', title: 'New Root' });
		executor.reset(newRoot);

		expect(executor.currentSpec?.title).toBe('New Root');
		expect(executor.canGoBack).toBe(false);
		expect(executor.historyLength).toBe(1);
		expect(executor.getAccumulatedContext()).toEqual({});
	});

	it('falls back to the linear chain when chain_map does not match', () => {
		const withChain = step({
			id: 'linear_step',
			intent: 'select',
			title: 'Linear Step',
			chain_map: { specific: step({ intent: 'info', title: 'Specific Path' }) },
			chain: step({ intent: 'form', title: 'Default Path' })
		});
		executor.reset(withChain);
		const next = executor.advance({ id: 'unknown' }, {});
		expect(next?.title).toBe('Default Path');
	});

	it('updates current state without advancing', () => {
		executor.updateCurrentState({ id: 'partial' }, { draft: 'data' });
		expect(executor.currentState?.selected).toEqual({ id: 'partial' });
		expect(executor.currentState?.formData).toEqual({ draft: 'data' });
	});
});

describe('ChainExecutor — context keys (flowId precedence, RFC 13)', () => {
	it('prefers flowId over id and title for the context key', () => {
		const root = step({
			id: 'spec-id',
			flowId: 'pick_goal',
			intent: 'select',
			title: 'Pick a goal',
			chain: step({ intent: 'confirm', title: 'Done' })
		});
		const executor = new ChainExecutor(root);
		executor.advance({ id: 'g1' }, { note: 'x' });

		const ctx = executor.getAccumulatedContext();
		expect(ctx['pick_goal_selection']).toEqual({ id: 'g1' });
		expect(ctx['pick_goal_formData']).toEqual({ note: 'x' });
		// id / title keys must NOT be used when flowId is present.
		expect(ctx['spec-id_selection']).toBeUndefined();
		expect(ctx['pick_a_goal_selection']).toBeUndefined();
	});

	it('falls back id -> slug(title) -> step_N when flowId is absent', () => {
		const executor = new ChainExecutor(
			step({ intent: 'select', title: 'Choose Restaurant', chain: step({ intent: 'select', title: 'Choose Time', chain: step({ intent: 'confirm' }) }) })
		);
		executor.advance({ id: 'r1' }, {});
		executor.advance({ id: 't1' }, {});
		const ctx = executor.getAccumulatedContext();
		expect(ctx['choose_restaurant_selection']).toBeDefined();
		expect(ctx['choose_time_selection']).toBeDefined();
	});
});

describe('ChainExecutor — terminal onComplete (RFC 13)', () => {
	it('returns null from advance at a terminal step', () => {
		const executor = new ChainExecutor(step({ intent: 'confirm', title: 'Only step' }));
		expect(executor.advance({ id: 'x' }, {})).toBeNull();
	});

	it('terminalAction returns the step onComplete and the accumulated payload', () => {
		const terminal = step({
			id: 'done',
			flowId: 'confirm',
			intent: 'confirm',
			onComplete: { kind: 'emit', event: 'wizard.done' }
		});
		const root = step({ flowId: 'pick', intent: 'select', chain: terminal });
		const executor = new ChainExecutor(root);

		// Step into the terminal step, recording step-1 data.
		executor.advance({ id: 'a', label: 'A' }, {});
		expect(executor.isTerminal).toBe(true);

		// Submitting the terminal step returns null...
		expect(executor.advance({ id: 'final' }, { agree: true })).toBeNull();

		const result = executor.terminalAction();
		expect(result).not.toBeNull();
		expect(result?.action).toEqual({ kind: 'emit', event: 'wizard.done' });
		// Payload carries every step's namespaced data.
		expect(result?.payload['pick_selection']).toEqual({ id: 'a', label: 'A' });
		expect(result?.payload['confirm_formData']).toEqual({ agree: true });
	});

	it('terminalAction returns null when more steps remain', () => {
		const executor = new ChainExecutor(
			step({ flowId: 'a', intent: 'select', chain: step({ intent: 'confirm' }) })
		);
		expect(executor.terminalAction()).toBeNull();
	});

	it('terminalAction yields an undefined action when the terminal step declares none', () => {
		const executor = new ChainExecutor(step({ intent: 'confirm', flowId: 'end' }));
		executor.advance({ id: 'x' }, {});
		const result = executor.terminalAction();
		expect(result).not.toBeNull();
		expect(result?.action).toBeUndefined();
	});
});

describe('ChainExecutor — back / forward navigation (RFC 13)', () => {
	const tree: UniversalSpec = step({
		flowId: 's1',
		intent: 'select',
		title: 'One',
		chain: step({ flowId: 's2', intent: 'form', title: 'Two', chain: step({ flowId: 's3', intent: 'confirm', title: 'Three' }) })
	});

	it('moves between the history and forward stacks', () => {
		const executor = new ChainExecutor(tree);
		executor.advance({ id: 'a' }, {}); // -> Two
		executor.advance({ id: 'b' }, {}); // -> Three
		expect(executor.currentSpec?.title).toBe('Three');
		expect(executor.canGoForward).toBe(false);

		executor.back(); // -> Two
		expect(executor.currentSpec?.title).toBe('Two');
		expect(executor.canGoForward).toBe(true);
		expect(executor.forwardStackLength).toBe(1);

		executor.forward(); // -> Three
		expect(executor.currentSpec?.title).toBe('Three');
		expect(executor.canGoForward).toBe(false);
	});

	it('back returns null at the root and forward returns null with an empty stack', () => {
		const executor = new ChainExecutor(tree);
		expect(executor.back()).toBeNull();
		expect(executor.forward()).toBeNull();
	});
});

describe('ChainExecutor — required-field validation at advance time (bug repro)', () => {
	// A two-step form→confirm flow whose step 1 declares three REQUIRED fields
	// (mirrors the captain's refund-request flow: Order ID / Refund amount /
	// Reason required, Notes optional). `form_fields` is the structured field set
	// the pocketpaw builder emits onto every form step (each carries `required`).
	function refundFlow(): UniversalSpec {
		const confirm = step({ intent: 'confirm', flowId: 'confirm', title: 'Confirm' });
		return step({
			intent: 'form',
			flowId: 'refund',
			title: 'Request a refund',
			chain: confirm,
			// The structured field spec the builder threads through (required flag
			// already present end-to-end: descriptor.fields[].required → form_fields).
			form_fields: [
				{ id: 'order_id', label: 'Order ID', type: 'text', required: true },
				{ id: 'refund_amount', label: 'Refund amount', type: 'number', required: true },
				{ id: 'reason', label: 'Reason', type: 'textarea', required: true },
				{ id: 'notes', label: 'Notes', type: 'textarea', required: false }
			]
		} as Partial<UniversalSpec> & { intent: UniversalSpec['intent'] });
	}

	it('does NOT advance when every required field is empty (the reported bug)', () => {
		const executor = new ChainExecutor(refundFlow());
		// Continue with everything blank — the production Continue button resolves
		// `{state.x}` placeholders to '' for empty inputs, so advance() receives
		// empty strings for each required field.
		const next = executor.advance(null, { order_id: '', refund_amount: '', reason: '', notes: '' });

		// MUST block: no next step, still on step 1.
		expect(next).toBeNull();
		expect(executor.currentSpec?.flowId).toBe('refund');
		expect(executor.historyLength).toBe(1);
		// Per-field errors surfaced for the UI.
		expect(executor.hasValidationErrors).toBe(true);
		expect(executor.validationErrors.order_id).toBeTruthy();
		expect(executor.validationErrors.refund_amount).toBeTruthy();
		expect(executor.validationErrors.reason).toBeTruthy();
		// The optional field is never flagged.
		expect(executor.validationErrors.notes).toBeUndefined();
	});

	it('treats whitespace-only required values as empty (blocks the advance)', () => {
		const executor = new ChainExecutor(refundFlow());
		const next = executor.advance(null, {
			order_id: '   ',
			refund_amount: '\t',
			reason: '\n ',
			notes: ''
		});
		expect(next).toBeNull();
		expect(executor.historyLength).toBe(1);
		expect(executor.hasValidationErrors).toBe(true);
	});

	it('flags ONLY the missing required field when others are filled', () => {
		const executor = new ChainExecutor(refundFlow());
		const next = executor.advance(null, {
			order_id: 'A-1001',
			refund_amount: '49.99',
			reason: '', // the one missing required field
			notes: 'ship it'
		});
		expect(next).toBeNull();
		expect(executor.historyLength).toBe(1);
		expect(executor.validationErrors.order_id).toBeUndefined();
		expect(executor.validationErrors.refund_amount).toBeUndefined();
		expect(executor.validationErrors.reason).toBeTruthy();
	});

	it('advances and clears errors once every required field is filled', () => {
		const executor = new ChainExecutor(refundFlow());

		// First attempt blocks and records errors.
		expect(executor.advance(null, { order_id: '', refund_amount: '', reason: '' })).toBeNull();
		expect(executor.hasValidationErrors).toBe(true);

		// Fill everything required → advance succeeds and errors clear.
		const next = executor.advance(null, {
			order_id: 'A-1001',
			refund_amount: '49.99',
			reason: 'Item arrived damaged',
			notes: '' // optional, fine to leave blank
		});
		expect(next).not.toBeNull();
		expect(next?.flowId).toBe('confirm');
		expect(executor.currentSpec?.flowId).toBe('confirm');
		expect(executor.historyLength).toBe(2);
		expect(executor.hasValidationErrors).toBe(false);
		expect(executor.validationErrors).toEqual({});
	});

	it('records the entered formData in context only on a successful advance', () => {
		const executor = new ChainExecutor(refundFlow());
		executor.advance(null, { order_id: '', refund_amount: '', reason: '' }); // blocked
		expect(executor.getAccumulatedContext()).toEqual({});

		executor.advance(null, { order_id: 'A-1', refund_amount: '5', reason: 'damaged' });
		expect(executor.getAccumulatedContext()['refund_formData']).toEqual({
			order_id: 'A-1',
			refund_amount: '5',
			reason: 'damaged'
		});
	});

	it('does not validate a step with no form_fields (back-compat raw-ui steps)', () => {
		// A step carrying only a raw ui tree (no structured form_fields) must keep
		// advancing exactly as before — required validation is opt-in via the
		// field spec, so legacy hand-built flow steps are untouched.
		const executor = new ChainExecutor(
			step({ intent: 'form', flowId: 'legacy', chain: step({ intent: 'confirm' }) })
		);
		const next = executor.advance(null, {});
		expect(next).not.toBeNull();
		expect(executor.historyLength).toBe(2);
		expect(executor.hasValidationErrors).toBe(false);
	});
});

describe('ChainExecutor — depth & loop guards (RFC 13 §8)', () => {
	it('refuses to grow history past MAX_HISTORY_DEPTH', () => {
		// Build a linear chain longer than the cap so advance() keeps pushing.
		let tail: UniversalSpec = step({ intent: 'confirm', flowId: `step_${MAX_HISTORY_DEPTH + 5}` });
		for (let i = MAX_HISTORY_DEPTH + 4; i >= 0; i--) {
			tail = step({ intent: 'select', flowId: `step_${i}`, chain: tail });
		}
		const executor = new ChainExecutor(tail);

		// Advance well past the cap; each call uses a distinct selection id.
		let nullSeen = false;
		for (let i = 0; i < MAX_HISTORY_DEPTH + 10; i++) {
			const next = executor.advance({ id: `sel_${i}` }, {});
			if (next === null) {
				nullSeen = true;
				break;
			}
		}

		expect(nullSeen).toBe(true);
		expect(executor.historyLength).toBeLessThanOrEqual(MAX_HISTORY_DEPTH);
	});

	it('refuses to advance into a chain that points back into history (self-cycle)', () => {
		// Self-referential tree: the root's chain is the root itself. Must NOT
		// crash (Svelte $state proxy would overflow on a naive walk) and must
		// refuse to advance. Assert only on primitives — never hand the cyclic
		// spec to a matcher that would deep-serialize it.
		const root = step({ intent: 'select', flowId: 'loop' });
		(root as UniversalSpec).chain = root;
		const executor = new ChainExecutor(root);

		// First advance would re-enter the root (already on the stack) -> null.
		const next = executor.advance({ id: 'a' }, {});
		expect(next).toBeNull();
		expect(executor.historyLength).toBe(1);
	});

	it('refuses a chain_map branch that loops back to an ancestor step', () => {
		const root = step({ intent: 'select', flowId: 'a' });
		const child = step({ intent: 'select', flowId: 'b', chain_map: { back: root } });
		(root as UniversalSpec).chain = child;
		const executor = new ChainExecutor(root);

		executor.advance({ id: 'go' }, {}); // root -> child
		expect(executor.currentSpec?.flowId).toBe('b');
		const looped = executor.advance({ id: 'back' }, {}); // child -> root (cycle)
		expect(looped).toBeNull();
		expect(executor.historyLength).toBe(2);
	});
});
