// playwright.config.ts
// @file playwright.config.ts
// @description The durable REAL-BROWSER smoke-test harness for the RFC-12 motion
//   primitive. jsdom unit tests have repeatedly stayed green while the browser
//   stayed broken (the `display: contents` wrapper, the inert CSS scroll path),
//   so this config drives a real Chromium against a real dev server and lets the
//   e2e/ specs assert on COMPUTED styles — the only arbiter that catches the
//   "green tests, no pixels move" failure class.
// @created 2026-05-30 — PR #45 motion runtime close-out (real-browser harness).
//
// Run with: bunx playwright test
// The browser binary lives in the shared ms-playwright cache (install once via
//   `bunx playwright install chromium`); it is NOT vendored into the repo.
import { defineConfig, devices } from '@playwright/test';

/** Fixed port so the webServer URL and baseURL never drift. */
const PORT = 4173;

export default defineConfig({
	// e2e/ only — keeps these out of the vitest glob (src/**, scripts/**) and
	// keeps the jsdom suite out of Playwright.
	testDir: './e2e',
	// Motion needs reduced-motion OFF or the action strips transforms; force it
	// here so a CI box / a dev with "Reduce motion" on still gets a real result.
	use: {
		baseURL: `http://localhost:${PORT}`,
		reducedMotion: 'no-preference',
		trace: 'retain-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	// Boot the real app. `vite preview` after a build is the production-like path
	// (the CSS scroll-timeline path behaves closest to prod there); `bun run dev`
	// also works and is faster. We use the dev server so no build step is needed
	// to run the smoke-test locally; the assertions are on computed style, which
	// is identical either way.
	webServer: {
		command: `bun run dev --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}/showcase/motion`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
	// One retry locally smooths over a cold-start flake; the assertions are
	// deterministic computed-style reads, so a green run is a real green run.
	retries: process.env.CI ? 1 : 0,
	// Serial: the motion specs each drive window.scrollTo on the same route, and
	// a single worker keeps the computed-style reads deterministic (parallel
	// workers raced the cold dev-server start and made the first sample flaky).
	workers: 1,
	reporter: [['list']],
});
