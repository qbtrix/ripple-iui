/**
 * @file primitives/primitives-contract.test.ts
 * @description Updated 2026-09-26 (feature pages canon, F1 / G5): `Label` and
 *   `Textarea` added to EXPECTED and COMPONENTS.
 *
 *   NEW (2026-09-18). The contract behind the `./primitives` export
 *   subpath: an exact list of what it exports and what shape each name has.
 *
 *   Deliberately mechanical, and deliberately NOT a mount test. `ui-contract.
 *   test.ts` next door mounts every `./ui` export because that surface's whole
 *   risk is renderer context — a spec widget that silently needs `<Ripple spec>`
 *   underneath it. These are plain shadcn-svelte components with no renderer
 *   involvement, so the thing worth freezing is the SURFACE: the names a
 *   consumer can import, and whether each one is a component, a namespace with
 *   a `Root`, or a variant helper.
 *
 *   The list is asserted with `toEqual`, not `toContain`, on purpose. A barrel
 *   that gains a name by accident — a stray `export *`, a group added without
 *   the `exports` entry to reach it — fails here rather than shipping. Types
 *   are absent from the list because they do not exist at runtime.
 */
import { describe, expect, it } from 'vitest';
import * as primitives from './index.js';
import pkg from '../../../package.json' with { type: 'json' };

/** Every runtime name on the surface. Types are compile-time only. */
const EXPECTED = [
	'Badge',
	'Button',
	'Card',
	'Chart',
	'Input',
	'Label',
	'Progress',
	'Select',
	'Separator',
	'Switch',
	'Tabs',
	'Textarea',
	'badgeVariants',
	'buttonVariants',
];

/** Groups with sub-parts, re-exported as namespaces (`Card.Header`, …). */
const NAMESPACES = ['Card', 'Chart', 'Select', 'Tabs'];
/** Groups that are a single component. */
const COMPONENTS = ['Badge', 'Button', 'Input', 'Label', 'Progress', 'Separator', 'Switch', 'Textarea'];
/** `tv()` helpers the local barrels already export. */
const VARIANTS = ['badgeVariants', 'buttonVariants'];

const surface = primitives as unknown as Record<string, unknown>;

describe('the ./primitives surface', () => {
	it('exports exactly the expected names', () => {
		expect(Object.keys(surface).sort()).toEqual(EXPECTED);
	});

	it.each(COMPONENTS)('%s is a component', (name) => {
		expect(typeof surface[name]).toBe('function');
	});

	it.each(NAMESPACES)('%s is a namespace with a mountable Root', (name) => {
		const ns = surface[name] as Record<string, unknown>;
		expect(typeof ns).toBe('object');
		// Chart is the one group whose entry is not called Root — its barrel
		// names the two parts Container and Tooltip.
		const root = ns.Root ?? ns.Container;
		expect(typeof root, `${name} has no Root`).toBe('function');
	});

	it.each(VARIANTS)('%s is a variant helper', (name) => {
		expect(typeof surface[name]).toBe('function');
	});

	it('is reachable as a subpath, not just as a file', () => {
		// The barrel without the manifest entry is unreachable from outside the
		// package. manifest-consumable.test.ts already proves every entry points
		// into dist/; this only proves this one exists.
		const exports = (pkg as { exports: Record<string, unknown> }).exports;
		expect(exports['./primitives']).toBeDefined();
	});
});
