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
