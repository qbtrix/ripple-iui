// flow-spec.test.ts — the canonical Chain Flow detector (RFC 13).
// Created 2026-05-31. Pins the contract `<Ripple>` and paw-enterprise's chat
// frame both rely on: a spec is a flow when any of chain/chain_map/flowId/
// onComplete appears at the top level OR on the inner `ui` node, and NOTHING
// else trips it (so plain widget specs never engage the flow path).
import { describe, it, expect } from 'vitest';
import { isFlowSpec } from './flow-spec.js';

describe('isFlowSpec', () => {
	it('detects each flow field at the top level', () => {
		expect(isFlowSpec({ intent: 'select', chain: {} })).toBe(true);
		expect(isFlowSpec({ intent: 'select', chain_map: {} })).toBe(true);
		expect(isFlowSpec({ intent: 'form', flowId: 'step1' })).toBe(true);
		expect(isFlowSpec({ intent: 'confirm', onComplete: { kind: 'emit', event: 'x' } })).toBe(true);
	});

	it('detects flow fields one level down on `ui` (the start_flow envelope shape)', () => {
		expect(isFlowSpec({ version: '1.0', ui: { flowId: 'pick', chain_map: {} } })).toBe(true);
		expect(isFlowSpec({ intent: 'custom', ui: { chain: {} } })).toBe(true);
	});

	it('returns false for a plain widget spec (no flow fields)', () => {
		expect(isFlowSpec({ intent: 'custom', ui: { type: 'card', children: [] } })).toBe(false);
		expect(isFlowSpec({ version: '2.0', intent: 'form', ui: { type: 'input' } })).toBe(false);
	});

	it('returns false for non-objects', () => {
		expect(isFlowSpec(null)).toBe(false);
		expect(isFlowSpec(undefined)).toBe(false);
		expect(isFlowSpec('chain')).toBe(false);
		expect(isFlowSpec(42)).toBe(false);
	});

	it('does not descend two levels — a flow field on `ui.ui` is not a top-level flow', () => {
		// Detection is intentionally shallow: top-level or one `ui` hop, matching
		// paw-enterprise's isFlowSpec. Deeper nesting isn't a flow root.
		expect(isFlowSpec({ intent: 'custom', ui: { type: 'container', ui: { flowId: 'x' } } })).toBe(false);
	});
});
