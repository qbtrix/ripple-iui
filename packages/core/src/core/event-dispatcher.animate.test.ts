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
//   - 2026-08-25 (monorepo split): the runtime-pulse cases MOVED to
//     @ripple-ui/svelte (core/event-dispatcher.animate.dom.test.ts). They need
//     jsdom and a real motion player, and the player is a Svelte action — the
//     engine only emits the event and calls an injected player if it has one.
//     What stays here is the part that is genuinely engine behaviour.
import { describe, expect, it, vi } from 'vitest';
// See event-dispatcher.test.ts — engine tests use the engine's store.
import { createHeadlessStateManager as createStateManager } from '../headless/state.js';
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
});
