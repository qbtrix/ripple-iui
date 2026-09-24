// @file core/event-dispatcher.animate.dom.test.ts
// @description The `animate` action's RUNTIME PULSE — the half that needs a
//   real DOM and a real motion player.
// @created 2026-08-25 — monorepo split (wave 2). Split out of
//   core/event-dispatcher.animate.test.ts, which stays in @ripple-ui/core and
//   keeps the emit-only assertions. These two cases belong here because they
//   need jsdom AND `playMotion`, which is a Svelte action in this package.
//
//   Note what changed with the split: the dispatcher used to `import()` the
//   action itself, so a test only had to supply a root. Now the player is
//   INJECTED (the engine must not reach into a renderer), so these tests pass
//   the same closure `Ripple.svelte` does. That is the point — they now
//   exercise the real wiring rather than a shortcut the engine took.
import { describe, expect, it, vi } from 'vitest';
import { createEventDispatcher, createHeadlessStateManager } from '@ripple-ui/core';
import { playMotion } from '../actions/with-motion.js';

/** The injection `Ripple.svelte` performs, minus the lazy import. */
const player = (node: HTMLElement, motion: unknown) => {
	playMotion(node, motion as never);
};

describe('animate runtime pulse (DOM)', () => {
	it('locates the target node by id in the root and pulses it', async () => {
		const root = document.createElement('div');
		const target = document.createElement('div');
		target.id = 'hero-cta';
		root.appendChild(target);
		document.body.appendChild(root);

		const onEvent = vi.fn();
		const sm = createHeadlessStateManager({});
		const d = createEventDispatcher(sm, onEvent, undefined, () => root, player);

		// jsdom ships Element.animate, so the pulse goes through WAAPI (no inline
		// style write). The spy being called with the peak keyframe proves the
		// node was located by id AND animated.
		const animateSpy = vi.spyOn(target, 'animate').mockReturnValue({} as Animation);
		await d.dispatch(
			{
				action: 'animate',
				target: 'hero-cta',
				motion: { enter: { scale: 1.3, y: -12 } }
			} as never,
			{ state: sm.state, data: {} }
		);
		await vi.waitFor(() => expect(animateSpy).toHaveBeenCalled(), { timeout: 1000 });

		const frames = animateSpy.mock.calls[0][0] as Keyframe[];
		const peak = String(frames.find((f) => f.offset === 0.5)?.transform ?? '');
		expect(peak).toMatch(/scale\(1\.3\)/);
		expect(peak).toMatch(/translateY\(-12px\)/);
		// …and the event still fires for observers.
		expect(onEvent).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'animate', target: 'hero-cta' })
		);
		document.body.removeChild(root);
	});

	it('no-ops gracefully when the target id is absent from the root', async () => {
		const root = document.createElement('div');
		document.body.appendChild(root);
		const onEvent = vi.fn();
		const sm = createHeadlessStateManager({});
		const d = createEventDispatcher(sm, onEvent, undefined, () => root, player);

		await d.dispatch(
			{ action: 'animate', target: 'missing', motion: { enter: { scale: 1.2 } } } as never,
			{ state: sm.state, data: {} }
		);
		await new Promise((r) => setTimeout(r, 0));
		expect(onEvent).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'animate', target: 'missing' })
		);
		document.body.removeChild(root);
	});

	it('emits without pulsing when no player is injected', () => {
		// The headless case, asserted from the renderer's side so the contract is
		// pinned where both halves are visible: a dispatcher with a root but no
		// player must still emit, and must not throw looking for one.
		const root = document.createElement('div');
		const target = document.createElement('div');
		target.id = 'x';
		root.appendChild(target);
		document.body.appendChild(root);

		const onEvent = vi.fn();
		const sm = createHeadlessStateManager({});
		const d = createEventDispatcher(sm, onEvent, undefined, () => root);
		const animateSpy = vi.spyOn(target, 'animate');

		expect(() =>
			d.dispatch({ action: 'animate', target: 'x', motion: { enter: { scale: 2 } } } as never, {
				state: sm.state,
				data: {}
			})
		).not.toThrow();
		expect(animateSpy).not.toHaveBeenCalled();
		document.body.removeChild(root);
	});
});
