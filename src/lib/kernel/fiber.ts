// fiber.ts — the lifecycle handle for one mounted plugin instance.
// Created: 2026-08-24 — SEMANTICS.md §4 state machine (PENDING / LOADING /
//   ACTIVE / UNLOADING / DISPOSED / FAILED) plus the two dragons: disposal
//   begun while `apply` is still running awaits `apply` and then cleans up
//   everything it collected (never concurrently, never through ACTIVE), and a
//   throwing `apply` rolls its collected effects back LIFO and lands in FAILED
//   holding nothing live. Children are disposed before the parent's own
//   effects. All work for one fiber is serialized on a single task chain,
//   which is what makes "not concurrent" structural rather than accidental.
// Updated: 2026-08-24 — SEMANTICS §3 fourth dragon (spec 730e593): a throwing
//   disposer must not abort the chain. Errors are contained per disposer, the
//   remaining disposers still run in order, the fiber still reaches its target
//   state, and the aggregate is reported after unwinding and rethrown to
//   whoever awaited `dispose()`. Previously the first throw abandoned the rest
//   of the chain (leaking every earlier effect), stranded the fiber in
//   UNLOADING, and resolved as if cleanup had succeeded.

import type { Context, EffectHandle, Plugin } from './context.js';

export type FiberState =
  | 'PENDING'
  | 'LOADING'
  | 'ACTIVE'
  | 'UNLOADING'
  | 'DISPOSED'
  | 'FAILED';

export class Fiber {
  readonly name: string;
  readonly plugin: Plugin;
  /** The context handed to `apply`. */
  readonly ctx: Context;
  readonly parent: Fiber | null;
  readonly children: Fiber[] = [];

  state: FiberState = 'PENDING';
  /** The error that sent this fiber to FAILED, if any. */
  error: unknown = undefined;

  private readonly effects: EffectHandle[] = [];
  private readonly runtime: Context['runtime'];
  private tail: Promise<void> = Promise.resolve();
  private inFlight = 0;
  private disposeRequested = false;

  constructor(parentCtx: Context, plugin: Plugin) {
    this.plugin = plugin;
    this.name = plugin.name;
    this.parent = parentCtx.fiber;
    this.runtime = parentCtx.runtime;
    this.ctx = parentCtx.createPluginContext(plugin.name, this);
    this.runtime.register(this);
    this.parent?.children.push(this);

    if (this.depsMet()) {
      this.enqueue(() => this.load());
    } else {
      this.setState('PENDING');
    }
  }

  /** Resolves when this fiber's currently queued work has settled. */
  ready(): Promise<void> {
    return this.tail;
  }

  /** True when no work is queued or running for this fiber. */
  idle(): boolean {
    return this.inFlight === 0;
  }

  /** Every required injection resolves to a present value. */
  depsMet(): boolean {
    const required = this.plugin.inject?.required ?? [];
    return required.every((key) => this.ctx.get(key) !== undefined);
  }

  /** Internal: an effect owned by this fiber, appended in registration order. */
  collect(handle: EffectHandle): void {
    this.effects.push(handle);
  }

  private setState(next: FiberState): void {
    this.state = next;
    this.runtime.trace(`${this.name}:${next}`);
  }

  /**
   * Serialize `task` behind this fiber's existing work.
   *
   * The returned promise rejects if the task fails, so a caller that awaits
   * `dispose()` learns that teardown went wrong. The *chain* it leaves behind
   * never rejects: `tail` is what `ready()`/`settle()` await, and a rejected
   * tail would turn one failed teardown into a cascade.
   */
  private enqueue(task: () => Promise<void>): Promise<void> {
    this.inFlight += 1;
    const next = this.tail.then(task);
    this.tail = next
      .catch((err: unknown) => {
        this.error = err;
      })
      .finally(() => {
        this.inFlight -= 1;
      });
    return next;
  }

  /**
   * Re-check dependencies after a service appeared or disappeared. Activation
   * and unload both run on the fiber's own task chain.
   */
  async reconcile(): Promise<void> {
    if (this.disposeRequested) return;
    if (this.state === 'PENDING' && this.depsMet()) {
      await this.enqueue(() => this.load());
      return;
    }
    if (this.state === 'ACTIVE' && !this.depsMet()) {
      // A withdrawn requirement returns the plugin to PENDING, not DISPOSED:
      // it must re-activate if the service comes back (SEMANTICS §2).
      // A teardown failure here has already been reported by unloadTo, and it
      // must not propagate into the flush loop and stall every other fiber.
      await this.enqueue(() => this.unloadTo('PENDING')).catch(() => {});
    }
  }

  private async load(): Promise<void> {
    if (this.state === 'DISPOSED' || this.state === 'FAILED') return;
    this.setState('LOADING');
    try {
      await this.plugin.apply(this.ctx);
    } catch (err) {
      this.error = err;
      const teardownErrors = await this.rollback();
      this.setState('FAILED');
      // The apply failure is the primary error and is already on `this.error`;
      // any disposer that also threw during rollback is reported alongside it
      // rather than replacing it or vanishing.
      if (teardownErrors.length) this.runtime.reportError(aggregate(teardownErrors));
      return;
    }
    if (this.disposeRequested) {
      // Dragon: disposal requested mid-apply. We awaited apply above, so
      // cleanup never races the rest of it, and we never pass through ACTIVE.
      await this.unloadTo('DISPOSED');
      return;
    }
    this.setState('ACTIVE');
  }

  /**
   * Unwind everything this fiber holds and land in `target`. Children go
   * first: a parent effect may own a resource a child still uses.
   *
   * Dragon (§3): a throwing disposer must not abort the chain. Errors are
   * contained per disposer, the fiber still reaches `target`, and the
   * aggregate is reported afterwards and rethrown for whoever awaited.
   */
  private async unloadTo(target: 'PENDING' | 'DISPOSED'): Promise<void> {
    this.setState('UNLOADING');
    const errors = [...(await this.disposeChildren()), ...(await this.runDisposers())];
    this.setState(target);
    if (target === 'DISPOSED') this.runtime.unregister(this);
    if (errors.length) {
      const error = aggregate(errors);
      this.error = error;
      this.runtime.reportError(error);
      throw error;
    }
  }

  /**
   * Roll back after a throwing `apply`. No UNLOADING: the fiber never loaded.
   * Returns the teardown errors instead of throwing, so they cannot displace
   * the apply failure that caused the rollback.
   */
  private async rollback(): Promise<unknown[]> {
    return [...(await this.disposeChildren()), ...(await this.runDisposers())];
  }

  /** Dispose children newest-first, containing each one's teardown errors. */
  private async disposeChildren(): Promise<unknown[]> {
    const errors: unknown[] = [];
    const children = this.children.splice(0, this.children.length);
    for (const child of children.reverse()) {
      try {
        await child.dispose();
      } catch (err) {
        // Already reported by the child; collected so the parent's caller sees
        // it too. One bad child must not strand its siblings.
        errors.push(err);
      }
    }
    return errors;
  }

  /**
   * Run every collected disposer, LIFO, at most once each. A throw is
   * contained and reported immediately, and the chain continues — otherwise
   * one bad disposer leaks every effect registered before it.
   */
  private async runDisposers(): Promise<unknown[]> {
    const errors: unknown[] = [];
    while (this.effects.length) {
      const handle = this.effects.pop()!;
      try {
        await handle();
      } catch (err) {
        errors.push(err);
        this.runtime.reportDisposerError(err);
      }
    }
    return errors;
  }

  /**
   * Dispose this fiber. Resolves only after all cleanup has settled, including
   * async disposers and the recursive disposal of children.
   *
   * Rejects if a disposer threw — teardown failure is not silent (§3). The
   * rejection is pre-handled so that a detached `void fiber.dispose()` cannot
   * become an unhandled rejection and take the host down; a caller that awaits
   * still receives it.
   */
  dispose(): Promise<void> {
    this.disposeRequested = true;
    const done = this.enqueue(async () => {
      if (this.state === 'DISPOSED') return;
      if (this.state === 'FAILED') {
        // FAILED already holds no live effects; just retire the handle.
        this.runtime.unregister(this);
        this.setState('DISPOSED');
        return;
      }
      if (this.state === 'PENDING') {
        this.runtime.unregister(this);
        this.setState('DISPOSED');
        return;
      }
      await this.unloadTo('DISPOSED');
    });
    // Marks the rejection handled without consuming it: `done` still rejects
    // for an awaiting caller, but an ignored `dispose()` cannot crash the host.
    done.catch(() => {});
    return done;
  }
}

/** One error passes through; several become an AggregateError (§3). */
function aggregate(errors: unknown[]): unknown {
  if (errors.length === 1) return errors[0];
  return new AggregateError(errors, 'kernel: teardown failed');
}
