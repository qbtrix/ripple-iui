// vitest.config.ts — @ripple-ui/core
//
// The engine has no components, so there is nothing to mount and no jsdom to
// set up: `node` is the honest environment. It is also the point. If a test
// here needs a DOM, something framework-shaped has leaked into a package whose
// whole claim is that it has not, and the failure should be loud.
//
// Created 2026-08-25 (monorepo split, wave 2).

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
		globals: true
	}
});
