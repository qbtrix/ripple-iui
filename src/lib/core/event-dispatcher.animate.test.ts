// src/lib/core/event-dispatcher.animate.test.ts
// @file core/event-dispatcher.animate.test.ts
// @description Tests the `animate` event-action — an imperative animation
//   trigger that is BOTH a runtime behavior and a host-observed event. Asserts:
//   (a) it still emits an `animate` RippleEvent carrying target + motion (host
//   observers / override), (b) the handler parses as a valid EventHandler, and
//   (c) the runtime path — given a DOM root + a target node with the matching id
//   — locates that node and pulses it (its inline transform mutates), proving
//   `animate` moves a target with NO host code. Browser-level proof of the same
//   behavior (computed-style delta in real Chromium) lives in e2e/motion.spec.ts.
// @created 2026-05-30 — RFC 12 animation primitive, Task 1.9.
// @changes
//   - 2026-05-30 (PR #45 animate runtime): added the runtime-pulse coverage —
//     the `getAnimateRoot` ctor arg + target-by-id lookup + playMotion path.
import { describe, expect, it, vi } from 'vitest';
import { createStateManager } from './state-manager.svelte.js';
import { createEventDispatcher } from './event-dispatcher.js';

describe('animate event-action', () => {
  it('emits an animate event to the host with target + motion', async () => {
    const onEvent = vi.fn();
    const sm = createStateManager({});
    const d = createEventDispatcher(sm, onEvent);
    await d.dispatch(
      { action: 'animate', target: 'cta', motion: { tap: { scale: 0.96 } } } as never,
      { state: sm.state, data: {} },
    );
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'animate', target: 'cta', motion: { tap: { scale: 0.96 } } }),
    );
  });

  it('parses as a valid EventHandler', async () => {
    const { EventHandler } = await import('../schema/event-handler.js');
    const r = EventHandler.safeParse({ action: 'animate', target: 'logo', motion: { enter: { opacity: 0 } } });
    expect(r.success).toBe(true);
  });

  it('runtime path: locates the target node by id in the root and pulses it', async () => {
    // A root with a target node carrying the animate id.
    const root = document.createElement('div');
    const target = document.createElement('div');
    target.id = 'hero-cta';
    root.appendChild(target);
    document.body.appendChild(root);

    const onEvent = vi.fn();
    const sm = createStateManager({});
    const d = createEventDispatcher(sm, onEvent, undefined, () => root);

    // jsdom now ships Element.animate, so the runtime pulse goes through WAAPI
    // (no inline-style write). Spy on the target's animate: it being called with
    // the peak keyframe proves the node was located by id AND animated.
    const animateSpy = vi.spyOn(target, 'animate').mockReturnValue({} as Animation);
    await d.dispatch(
      { action: 'animate', target: 'hero-cta', motion: { enter: { scale: 1.3, y: -12 } } } as never,
      { state: sm.state, data: {} },
    );
    // The runtime pulse imports playMotion lazily (dynamic import). Poll a few
    // ticks for the import promise to resolve and the animate call to land.
    await vi.waitFor(() => expect(animateSpy).toHaveBeenCalled(), { timeout: 1000 });

    const frames = animateSpy.mock.calls[0][0] as Keyframe[];
    const peak = String(frames.find((f) => f.offset === 0.5)?.transform ?? '');
    expect(peak).toMatch(/scale\(1\.3\)/);
    expect(peak).toMatch(/translateY\(-12px\)/);
    // …and the event still fires for observers.
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'animate', target: 'hero-cta' }),
    );
    document.body.removeChild(root);
  });

  it('runtime path: no-ops gracefully when the target id is absent from the root', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onEvent = vi.fn();
    const sm = createStateManager({});
    const d = createEventDispatcher(sm, onEvent, undefined, () => root);
    // Target not present — must not throw, must still emit for the host.
    await d.dispatch(
      { action: 'animate', target: 'missing', motion: { enter: { scale: 1.2 } } } as never,
      { state: sm.state, data: {} },
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'animate', target: 'missing' }));
    document.body.removeChild(root);
  });
});
