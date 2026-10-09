// widgets/data-kit/motion.ts — the two motions of the data widgets (design doc
// 2026-10-09 §2.6), as Svelte transitions: `in:rise={{ index }}` for a row that
// arrives after mount (streaming, "add a stop"), `in:slide` for a stage change
// in menu-order and booking. Local transitions do not play on a block's first
// render, which is the rule: rows that were there at mount just appear.
// Under prefers-reduced-motion both are opacity only, with no stagger.
// No looping motion lives here (the workout ring owns the only loop).
import { prefersReducedMotion } from 'svelte/motion';
import { quartOut } from 'svelte/easing';

const DURATION = 160;

/** Opacity 0→1 plus a 4px rise, staggered 30ms per row for the first 8 rows. */
export function rise(_node: Element, { index = 0 }: { index?: number } = {}) {
	const still = prefersReducedMotion.current;
	return {
		delay: still ? 0 : Math.min(Math.max(index, 0), 7) * 30,
		duration: DURATION,
		easing: quartOut,
		css: (t: number) => (still ? `opacity:${t}` : `opacity:${t};transform:translateY(${(1 - t) * 4}px)`)
	};
}

/** A stage entering from 12px to the side; `dir: -1` when going back. */
export function slide(_node: Element, { dir = 1 }: { dir?: 1 | -1 } = {}) {
	const still = prefersReducedMotion.current;
	return {
		duration: DURATION,
		easing: quartOut,
		css: (t: number) => (still ? `opacity:${t}` : `opacity:${t};transform:translateX(${(1 - t) * 12 * dir}px)`)
	};
}
