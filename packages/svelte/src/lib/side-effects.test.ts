// side-effects.test.ts — pins package.json "sideEffects". The package is marked
// side-effect free so a consumer's bundler can drop every module it does not
// use (without it, one discover or ui import pulled the whole Lucide barrel).
// A module that does work at import time (a top-level call, such as
// self-registering into a registry) must be listed, or bundlers drop it and
// the registration silently disappears. This scans src/lib for top-level call
// statements and fails on any module missing from the list.
import { describe, expect, it } from 'vitest';
import pkg from '../../package.json';

// Vite's raw glob, not node:fs: ripple's tsconfig carries no node types.
const SOURCES = import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;

describe('package.json sideEffects', () => {
	it('keeps CSS', () => {
		expect(pkg.sideEffects).toContain('**/*.css');
	});

	it('lists every module with a top-level call', () => {
		const effectful = Object.entries(SOURCES)
			.filter(([, src]) => /^[A-Za-z_$][\w$.]*\(/m.test(src))
			.map(([path]) => `./dist/${path.slice(2).replace(/\.ts$/, '.js')}`);
		expect(effectful.length).toBeGreaterThan(0);
		expect(pkg.sideEffects).toEqual(expect.arrayContaining(effectful));
	});
});
