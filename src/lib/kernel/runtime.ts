// runtime.ts — shared root state for the paw composition kernel.
// Created: 2026-08-24 — Initial implementation of the paw composition kernel
//   (SEMANTICS.md v0.1.0). Holds the trace sink, the fiber registry, and the
//   deferred-reconciliation queue that turns a service appearing/disappearing
//   into activation/unload of the fibers that inject it.
// Semantics lineage: Cordis (MIT, Shigma) — ported semantics, not code.

import type { Fiber } from './fiber.js';

/** A trace sink. The conformance harness installs one; production installs none. */
export type TraceSink = (token: string) => void;

/**
 * Shared per-tree state. One Runtime backs a root context and every context and
 * fiber descended from it.
 */
export class Runtime {
  /** Optional observer of lifecycle tokens (see conformance/README.md). */
  onTrace: TraceSink | null = null;

  /** Every live fiber, in mount order. Disposed fibers are removed. */
  readonly fibers: Fiber[] = [];

  /** Fibers whose dependency state may have changed and need re-checking. */
  private readonly queue: Fiber[] = [];

  private flushing: Promise<void> | null = null;

  trace(token: string): void {
    this.onTrace?.(token);
  }

  register(fiber: Fiber): void {
    this.fibers.push(fiber);
  }

  unregister(fiber: Fiber): void {
    const i = this.fibers.indexOf(fiber);
    if (i >= 0) this.fibers.splice(i, 1);
    const q = this.queue.indexOf(fiber);
    if (q >= 0) this.queue.splice(q, 1);
  }

  /**
   * Mark every live fiber as needing a dependency re-check. Called when a
   * service is published or withdrawn anywhere in the tree. Deliberately
   * deferred: a plugin that publishes a service mid-`apply` must finish
   * settling before its dependents load (SEMANTICS §2, load-order-inject).
   */
  notifyAll(): void {
    for (const fiber of this.fibers) {
      if (!this.queue.includes(fiber)) this.queue.push(fiber);
    }
  }

  /** Drain the reconciliation queue. Re-entrant calls join the running drain. */
  flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    const run = async () => {
      while (this.queue.length) {
        const fiber = this.queue.shift()!;
        await fiber.reconcile();
      }
    };
    this.flushing = run().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  /**
   * Await quiescence: no queued reconciliation and no fiber with work in
   * flight. Loops because an unload can re-queue a fiber that then loads.
   */
  async settle(): Promise<void> {
    for (let pass = 0; pass < 100; pass += 1) {
      await this.flush();
      await Promise.all(this.fibers.map((fiber) => fiber.ready()));
      // Give any continuation scheduled by the awaits above a chance to queue.
      await Promise.resolve();
      if (!this.queue.length && this.fibers.every((fiber) => fiber.idle())) return;
    }
    throw new Error('kernel: settle() did not reach quiescence');
  }
}
