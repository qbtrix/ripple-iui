// test-setup.ts — vitest setup for the `client` (jsdom) project.
// Fills in the browser APIs jsdom does not implement, for every test file at
// once. Anything shimmed here must be shimmed defensively: a suite that wants
// its own spy has to be able to replace it.
// 2026-09-14: ResizeObserver moved here from a `beforeAll` inside
// ui/ui-contract.test.ts, where it leaked onto globalThis for whatever ran next
// and only covered the one file that happened to install it.
// 2026-09-18: matchMedia added, for the `./primitives` surface — see below.
// 2026-09-24: added the deferred-overlay-teardown drain at the bottom (from
// PR #101). bits-ui restores the body style ~24ms AFTER an open overlay
// unmounts, and if a file ended inside that window vitest destroyed jsdom first
// and the timer threw an unhandled `ReferenceError: document is not defined`.
// Seen from overlay/CommandPalette.test.ts and ui/ui-contract.test.ts.
import { afterAll } from 'vitest';
import '@testing-library/jest-dom/vitest';

// jsdom has no ResizeObserver. bits-ui's floating content constructs one, and
// so do the chart widgets. Defined as writable + configurable so a suite can
// still swap in its own (widgets/widget-id-forwarding.test.ts assigns one).
if (typeof globalThis.ResizeObserver === 'undefined') {
	Object.defineProperty(globalThis, 'ResizeObserver', {
		value: class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
		writable: true,
		configurable: true,
	});
}

// jsdom doesn't implement the Web Animations API (`Element.animate`), which
// Svelte's motion transitions (e.g. `in:fly` on a flow step card) call at
// mount. Stub it so component tests that trigger a transition don't throw
// `element.animate is not a function`. Returns a minimal Animation-like object
// (the bits Svelte's transition runner touches). Production rendering uses the
// real browser API; this only affects the jsdom test environment.
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
	Element.prototype.animate = function animate() {
		return {
			cancel() {},
			finish() {},
			play() {},
			pause() {},
			reverse() {},
			addEventListener() {},
			removeEventListener() {},
			finished: Promise.resolve(),
			currentTime: 0,
			startTime: 0,
			playState: 'finished',
			onfinish: null,
			oncancel: null,
		} as unknown as Animation;
	};
}

// jsdom does not implement `window.matchMedia` at all. Svelte's
// `prefersReducedMotion` is a module-level `new MediaQuery(...)` inside
// `svelte/motion`, and its constructor calls `window.matchMedia` eagerly — so
// merely IMPORTING anything that reaches svelte/motion throws here, before a
// single test runs. layerchart does reach it, which makes the chart twin on the
// `./primitives` surface the first thing in this repo to trip it.
// Reports no preference, which is the browser default. Writable + configurable
// like the others: actions/with-motion.test.ts stubs its own to assert the
// reduced-motion path.
if (typeof globalThis.matchMedia === 'undefined') {
	Object.defineProperty(globalThis, 'matchMedia', {
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener() {},
			removeEventListener() {},
			addListener() {},
			removeListener() {},
			dispatchEvent() {
				return false;
			},
		}),
		writable: true,
		configurable: true,
	});
}
/**
 * How long a test file waits, after its last test, for overlay teardown work
 * that was deferred past unmount.
 *
 * Sized against the longest deferral we depend on: bits-ui's body-scroll-lock
 * schedules its body-style restore 24ms after the last lock is released
 * (`internal/body-scroll-lock.svelte.js`, the grace window that stops a
 * same-tick close/reopen from flashing the scrollbar). The dismissible-layer
 * debounce adds a 20ms one on the same teardown. 100ms clears both with room
 * for a version bump.
 */
export const OVERLAY_TEARDOWN_DRAIN_MS = 100;

// Captured at module scope so the drain still resolves if a test leaves
// `vi.useFakeTimers()` installed.
const realSetTimeout = globalThis.setTimeout;

/**
 * Give overlay teardown work that outlives `unmount()` a live document to run
 * against.
 *
 * Testing-library unmounts in `afterEach`, but a bits-ui overlay (Dialog,
 * Sheet, Popover, and everything built on them) leaves a timer pending that
 * reads `document.body` to restore the body style. Vitest destroys the jsdom
 * environment as soon as the file's hooks finish, which deletes the `document`
 * global. A file whose last test unmounted an open overlay therefore had ~24ms
 * in which the environment could vanish under an already-scheduled callback: a
 * red run with every assertion passing, more often on loaded CI runners.
 *
 * This is not a longer race. Our timer is scheduled strictly later than the
 * pending one and with a longer delay, so timer due-order guarantees the
 * deferred callback runs first however loaded the runner is.
 *
 * jsdom-only hygiene. In a real browser `document` never goes away mid-timer.
 */
export function drainDeferredOverlayTeardown(): Promise<void> {
	return new Promise((resolve) => {
		realSetTimeout(resolve, OVERLAY_TEARDOWN_DRAIN_MS);
	});
}

afterAll(drainDeferredOverlayTeardown);
