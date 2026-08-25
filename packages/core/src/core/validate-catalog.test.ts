// @file core/validate-catalog.test.ts
// @description Tests for the ENGINE's catalog gate — the catalog-agnostic
//   half that takes its widget types as an argument.
// @created 2026-08-25 — monorepo split (wave 2). The original tests for this
//   function moved to widgets/validate-catalog-bound.test.ts, because they
//   assert against the real Svelte widget catalog ("flex is known"). These
//   assert the property that makes the function belong in @ripple-ui/core:
//   it knows nothing about widgets until you tell it.
import { describe, it, expect } from 'vitest';
import { validateCatalog } from './validate-catalog.js';

const spec = { ui: { type: 'flex', children: [{ type: 'custom-thing' }] } };

describe('validateCatalog (engine, catalog injected)', () => {
	it('knows no widgets at all when none are supplied', () => {
		// The honest answer for a bare engine: it has no widgets of its own,
		// so every widget type is out of catalog. A renderer supplies the set.
		const unknown = validateCatalog(spec as never);
		expect(unknown.map((u) => u.type).sort()).toEqual(['custom-thing', 'flex']);
	});

	it('accepts an injected catalog', () => {
		const unknown = validateCatalog(spec as never, { widgetTypes: ['flex'] });
		expect(unknown).toHaveLength(1);
		expect(unknown[0]).toEqual({ path: 'ui.children[0]', type: 'custom-thing' });
	});

	it('unions widgetTypes with extraWidgetTypes', () => {
		const unknown = validateCatalog(spec as never, {
			widgetTypes: ['flex'],
			extraWidgetTypes: ['custom-thing']
		});
		expect(unknown).toEqual([]);
	});

	it('treats control flow as known without any catalog', () => {
		const control = { ui: { type: 'if', children: [{ type: 'each' }] } };
		expect(validateCatalog(control as never)).toEqual([]);
	});

	it('accepts any iterable as the catalog, not just an array', () => {
		// getWidgetTypes() returns an array today, but a registry could hand
		// over a Set directly; the signature should not force a copy.
		const unknown = validateCatalog(spec as never, {
			widgetTypes: new Set(['flex', 'custom-thing'])
		});
		expect(unknown).toEqual([]);
	});
});
