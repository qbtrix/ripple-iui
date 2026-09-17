// src/test-setup.ts — shared jsdom setup for the `client` vitest project.
// Updated: 2026-08-03 — added the deferred-overlay-teardown drain. Unmounting
//   an open bits-ui overlay does NOT restore the body style synchronously; the
//   restore is deferred ~24ms, and if the test file ended inside that window
//   vitest destroyed jsdom first and the timer threw an unhandled
//   `ReferenceError: document is not defined`. See the comment on
//   `drainDeferredOverlayTeardown` below.
import { afterAll } from 'vitest';
import '@testing-library/jest-dom/vitest';

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
 * The problem: `@testing-library/svelte`'s auto-cleanup unmounts components in
 * `afterEach`, but a bits-ui overlay (Dialog, and therefore CommandPalette,
 * Sheet, Popover…) does not finish tearing down there — it leaves a timer
 * pending that reaches for `document.body` to restore the body style. Vitest
 * destroys the jsdom environment as soon as the file's hooks finish, which
 * deletes the `document` global. A file whose last test unmounted an open
 * overlay therefore had ~24ms in which the environment could vanish out from
 * under an already-scheduled callback, producing an unhandled
 * `ReferenceError: document is not defined` and a red run with no failed
 * assertion. It fired maybe one run in dozens, more often on loaded Linux CI
 * runners than locally, which is what made it look like noise.
 *
 * The fix is not a longer race. Our timer is scheduled strictly later than the
 * pending one and with a longer delay, so timer due-order guarantees the
 * deferred callback runs first no matter how loaded the runner is.
 *
 * This is jsdom-only hygiene. In a real browser the same deferred restore is
 * correct and harmless — `document` never goes away mid-timer.
 */
export function drainDeferredOverlayTeardown(): Promise<void> {
	return new Promise((resolve) => {
		realSetTimeout(resolve, OVERLAY_TEARDOWN_DRAIN_MS);
	});
}

afterAll(drainDeferredOverlayTeardown);
