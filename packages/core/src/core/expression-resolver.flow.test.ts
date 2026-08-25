// expression-resolver.flow.test.ts — RFC 13 M1.
// Created 2026-05-31.
//
// Covers the Chain Flow `{state.x}` scope addition: `withFlowContext` layers a
// flow's accumulated, namespaced context onto the `state` scope so a later step
// pre-fills from an earlier one with `{state.<flowId>_selection.field}`, while
// real application state always wins on a key collision.
import { describe, it, expect } from 'vitest';
import {
	withFlowContext,
	resolveString,
	evaluateExpression,
	type ResolverContext
} from './expression-resolver.js';

const flowContext = {
	pick_goal_selection: { id: 'focus', label: 'Focus on my own work' },
	enter_details_formData: { workspace: 'Acme HQ' }
};

describe('withFlowContext', () => {
	it('returns the context unchanged when there is no flow context', () => {
		const ctx: ResolverContext = { state: { a: 1 } };
		expect(withFlowContext(ctx, undefined)).toBe(ctx);
		expect(withFlowContext(ctx, null)).toBe(ctx);
		expect(withFlowContext(ctx, {})).toBe(ctx);
	});

	it('resolves a cross-step selection field via {state.x}', () => {
		const ctx = withFlowContext({ state: {} }, flowContext);
		expect(resolveString('{state.pick_goal_selection.label}', ctx)).toBe('Focus on my own work');
		expect(resolveString('{state.pick_goal_selection.id}', ctx)).toBe('focus');
	});

	it('resolves a cross-step form field via {state.x}', () => {
		const ctx = withFlowContext({ state: {} }, flowContext);
		expect(resolveString('Workspace: {state.enter_details_formData.workspace}', ctx)).toBe(
			'Workspace: Acme HQ'
		);
	});

	it('lets real application state win over a flow key of the same name', () => {
		const ctx = withFlowContext(
			{ state: { pick_goal_selection: { label: 'REAL STATE' } } },
			flowContext
		);
		// App state shadows the flow context, never the other way around.
		expect(resolveString('{state.pick_goal_selection.label}', ctx)).toBe('REAL STATE');
	});

	it('keeps non-state scopes (item, data, loop vars) intact', () => {
		const ctx = withFlowContext(
			{ state: {}, item: { x: 1 }, data: { d: 2 }, custom: 'c' },
			flowContext
		);
		expect(evaluateExpression('item.x', ctx)).toBe(1);
		expect(evaluateExpression('data.d', ctx)).toBe(2);
		expect(ctx.custom).toBe('c');
		// And the flow keys are still reachable under state.
		expect(evaluateExpression('state.enter_details_formData.workspace', ctx)).toBe('Acme HQ');
	});

	it('does not mutate the original context', () => {
		const original: ResolverContext = { state: { keep: true } };
		withFlowContext(original, flowContext);
		expect(original.state).toEqual({ keep: true });
		expect((original.state as Record<string, unknown>).pick_goal_selection).toBeUndefined();
	});
});
