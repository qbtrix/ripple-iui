/**
 * @file discover/discover-contract.test.ts
 * @description The contract behind the `./discover` export subpath: an exact
 *   list of what it exports and what shape each name has, in the mould of
 *   `primitives-contract.test.ts`. Not a mount test; the SSR behaviour lives in
 *   `discover.ssr.test.ts`. The list is asserted with `toEqual` so a stray
 *   export or a renamed helper fails here rather than shipping. Types are
 *   absent because they do not exist at runtime.
 */
import { describe, expect, it } from 'vitest';
import * as discover from './index.js';
import pkg from '../../../package.json' with { type: 'json' };

/** Every runtime name on the surface, sorted. */
const EXPECTED = [
	'CARD_PALETTE',
	'DISCOVER_VIEWS',
	'DetailMedia',
	'DiscoverChips',
	'DiscoverEmpty',
	'DiscoverFilters',
	'DiscoverGrid',
	'DiscoverHeader',
	'DiscoverPublish',
	'DiscoverRow',
	'DiscoverSearch',
	'DiscoverSection',
	'DiscoverSkeleton',
	'DiscoverTile',
	'ItemArt',
	'initialFor',
	'isStudioKind',
	'itemHref',
	'mediaFor',
	'primaryFor',
	'remixLabel',
	'tintFor',
	'usageLabel',
	'usedLabel',
];

const COMPONENTS = [
	'DetailMedia',
	'DiscoverChips',
	'DiscoverEmpty',
	'DiscoverFilters',
	'DiscoverGrid',
	'DiscoverHeader',
	'DiscoverPublish',
	'DiscoverRow',
	'DiscoverSearch',
	'DiscoverSection',
	'DiscoverSkeleton',
	'DiscoverTile',
	'ItemArt',
];
const HELPERS = ['initialFor', 'isStudioKind', 'itemHref', 'mediaFor', 'primaryFor', 'remixLabel', 'tintFor', 'usageLabel', 'usedLabel'];

const surface = discover as unknown as Record<string, unknown>;

describe('the ./discover surface', () => {
	it('exports exactly the expected names', () => {
		expect(Object.keys(surface).sort()).toEqual(EXPECTED);
	});

	it.each(COMPONENTS)('%s is a component', (name) => {
		expect(typeof surface[name]).toBe('function');
	});

	it.each(HELPERS)('%s is a pure helper', (name) => {
		expect(typeof surface[name]).toBe('function');
	});

	it('CARD_PALETTE is a non-empty list of theme tokens', () => {
		const palette = surface.CARD_PALETTE as readonly string[];
		expect(palette.length).toBeGreaterThan(0);
		for (const tint of palette) expect(tint).toMatch(/^var\(--ripple-/);
	});

	it('DISCOVER_VIEWS lists the three views in toggle order', () => {
		expect(surface.DISCOVER_VIEWS).toEqual(['grid', 'shelves', 'list']);
	});

	it('is reachable as a subpath, not just as a file', () => {
		const exports = (pkg as { exports: Record<string, unknown> }).exports;
		expect(exports['./discover']).toBeDefined();
	});
});
