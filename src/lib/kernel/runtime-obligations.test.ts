// runtime-obligations.test.ts — SEMANTICS.md §7a, the TypeScript side.
// Created: 2026-08-24 — §7a covers hazards that are real but not
//   language-neutral, so they cannot live in the shared conformance fixtures.
//   Python's obligation is asyncio cancellation; JavaScript promises do not
//   cancel, so that one has no analogue here. What JavaScript has instead is
//   the unhandled rejection: a detached (un-awaited) dispose whose disposer
//   rejects takes the host process down under Node's default policy. The
//   fiber's task chain must therefore always attach a handler, and the error
//   must stay retrievable rather than vanishing.

import { describe, expect, it } from 'vitest';
import { Context } from './index.js';

describe('kernel — runtime-specific obligations (SEMANTICS §7a, TypeScript)', () => {
  it('a detached dispose with a rejecting disposer does not raise an unhandled rejection', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (event: PromiseRejectionEvent) => {
      unhandled.push(event.reason);
      event.preventDefault();
    };
    globalThis.addEventListener?.('unhandledrejection', onUnhandled as EventListener);

    try {
      const root = Context.root();
      const fiber = root.plugin({
        name: 'p',
        apply(ctx) {
          ctx.effect(() => async () => {
            throw new Error('disposer rejected');
          });
        },
      });
      await fiber.ready();

      // Fire-and-forget: nothing awaits this promise, which is exactly the
      // shape that crashes a Node host when the chain has no catch.
      void fiber.dispose();
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(unhandled).toEqual([]);
      // The failure is retained on the fiber rather than silently dropped.
      expect(String(fiber.error)).toContain('disposer rejected');
    } finally {
      globalThis.removeEventListener?.('unhandledrejection', onUnhandled as EventListener);
    }
  });

  it('parallel dispatch fans out rather than awaiting listeners in turn', async () => {
    // The shared suite covers this via parallel-awaits-all's ordered trace and
    // its 4x delay margin. Kept here as a margin-free structural check: with a
    // sequential implementation the total exceeds the sum of the delays.
    const root = Context.root();
    const order: string[] = [];
    const listener = (id: string, ms: number) => async () => {
      order.push(`${id}:enter`);
      await new Promise((resolve) => setTimeout(resolve, ms));
      order.push(`${id}:exit`);
    };
    root.on('pev', 'parallel', listener('L1', 20));
    root.on('pev', 'parallel', listener('L2', 5));

    await root.bus.parallel('pev', undefined);

    expect(order).toEqual(['L1:enter', 'L2:enter', 'L2:exit', 'L1:exit']);
  });
});
