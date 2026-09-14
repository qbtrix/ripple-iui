// test-setup.ts — vitest setup for the `client` (jsdom) project.
// Fills in the browser APIs jsdom does not implement, for every test file at
// once. Anything shimmed here must be shimmed defensively: a suite that wants
// its own spy has to be able to replace it.
// 2026-09-14: ResizeObserver moved here from a `beforeAll` inside
// ui/ui-contract.test.ts, where it leaked onto globalThis for whatever ran next
// and only covered the one file that happened to install it.
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
