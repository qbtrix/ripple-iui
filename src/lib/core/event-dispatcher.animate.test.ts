// src/lib/core/event-dispatcher.animate.test.ts
// @file core/event-dispatcher.animate.test.ts
// @description Tests the `animate` event-action — a host-delegated imperative
//   animation trigger. Asserts the dispatcher emits an `animate` RippleEvent
//   carrying the target + motion, and that the handler parses as a valid
//   EventHandler.
// @created 2026-05-30 — RFC 12 animation primitive, Task 1.9.
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
});
