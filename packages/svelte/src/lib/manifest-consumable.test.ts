/**
 * @file manifest-consumable.test.ts
 * @description Guards the manifest against declarations that work inside this
 * workspace and break for anyone outside it.
 *
 * The failure this exists for, in full: the split first shipped
 * `"@ripple-ui/core": "workspace:*"`. That resolves perfectly here, so every
 * in-repo signal was green — 1304 tests, svelte-check clean, both packages
 * built. It resolves against nothing for a consumer, because `workspace:` is
 * a protocol whose meaning comes from the workspace root, and a consumer
 * linking `file:../ripple/packages/svelte` has no such root. paw-sites hit it
 * on the first install:
 *
 *     error: Workspace dependency "@ripple-ui/core" not found
 *     Searched in ".\*"
 *
 * The general shape is what matters more than the one protocol: nothing in
 * this package's manifest may depend on being inside the monorepo, because
 * the manifest is exactly what leaves it. The repo's own test suite cannot
 * notice — it always runs inside the workspace, where these all work.
 *
 * @changes
 *   - 2026-08-25: created after `workspace:*` broke both consumers.
 */

import { describe, it, expect } from 'vitest';
import pkg from '../../package.json' with { type: 'json' };

type DepMap = Record<string, string>;

const manifest = pkg as unknown as {
	name: string;
	private?: boolean;
	dependencies?: DepMap;
	devDependencies?: DepMap;
	peerDependencies?: DepMap;
	exports?: Record<string, unknown>;
	files?: string[];
};

/** Protocols that only a package manager inside the workspace can resolve. */
const WORKSPACE_ONLY = /^(workspace|link):/;

describe('the published manifest is consumable outside this repo', () => {
	it('declares no workspace-only protocol in dependencies', () => {
		const offenders = Object.entries(manifest.dependencies ?? {}).filter(([, range]) =>
			WORKSPACE_ONLY.test(range)
		);
		expect(offenders).toEqual([]);
	});

	it('declares no workspace-only protocol in peerDependencies', () => {
		const offenders = Object.entries(manifest.peerDependencies ?? {}).filter(([, range]) =>
			WORKSPACE_ONLY.test(range)
		);
		expect(offenders).toEqual([]);
	});

	it('depends on @ripple-ui/core by a range a consumer can resolve', () => {
		// `file:../core` works two ways at once: bun links it in-workspace, and a
		// consumer installing this package pulls core in as a nested dependency.
		// A published release rewrites it to a version; until then this is the
		// only form that satisfies both.
		const range = manifest.dependencies?.['@ripple-ui/core'];
		expect(range, '@ripple-ui/core must be a declared dependency').toBeTruthy();
		expect(range).not.toMatch(WORKSPACE_ONLY);
	});

	it('is publishable — a name, not private', () => {
		expect(manifest.name).toBe('@ripple-ui/svelte');
		expect(manifest.private).toBeFalsy();
	});

	it('ships dist, which every export entry points into', () => {
		expect(manifest.files).toContain('dist');
		const targets: string[] = [];
		for (const entry of Object.values(manifest.exports ?? {})) {
			if (typeof entry === 'string') targets.push(entry);
			else if (entry && typeof entry === 'object') {
				targets.push(...Object.values(entry as Record<string, string>));
			}
		}
		expect(targets.length).toBeGreaterThan(0);
		for (const target of targets) {
			expect(target, 'every export must resolve into dist/').toMatch(/^\.\/dist\//);
		}
	});
});
