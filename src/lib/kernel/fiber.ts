// fiber.ts — the lifecycle handle for one mounted plugin instance.
// Created: 2026-08-24 — SEMANTICS.md §4 state machine (PENDING / LOADING /
//   ACTIVE / UNLOADING / DISPOSED / FAILED) plus the two dragons: disposal
//   begun while `apply` is still running awaits `apply` and then cleans up
//   everything it collected (never concurrently, never through ACTIVE), and a
//   throwing `apply` rolls its collected effects back LIFO and lands in FAILED
//   holding nothing live. Children are disposed before the parent's own
//   effects. All work for one fiber is serialized on a single task chain,
//   which is what makes "not concurrent" structural rather than accidental.

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

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.inFlight += 1;
    const next = this.tail
      .then(task)
      .catch((err: unknown) => {
        this.error = err;
      })
      .finally(() => {
        this.inFlight -= 1;
      });
    this.tail = next;
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
      await this.enqueue(() => this.unloadTo('PENDING'));
    }
  }

  private async load(): Promise<void> {
    if (this.state === 'DISPOSED' || this.state === 'FAILED') return;
    this.setState('LOADING');
    try {
      await this.plugin.apply(this.ctx);
    } catch (err) {
      this.error = err;
      await this.rollback();
      this.setState('FAILED');
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
   */
  private async unloadTo(target: 'PENDING' | 'DISPOSED'): Promise<void> {
    this.setState('UNLOADING');
    await this.disposeChildren();
    await this.runDisposers();
    this.setState(target);
    if (target === 'DISPOSED') this.runtime.unregister(this);
  }

  /** Roll back after a throwing `apply`. No UNLOADING: the fiber never loaded. */
  private async rollback(): Promise<void> {
    await this.disposeChildren();
    await this.runDisposers();
  }

  private async disposeChildren(): Promise<void> {
    const children = this.children.splice(0, this.children.length);
    for (const child of children.reverse()) {
      await child.dispose();
    }
  }

  private async runDisposers(): Promise<void> {
    while (this.effects.length) {
      const handle = this.effects.pop()!;
      await handle();
    }
  }

  /**
   * Dispose this fiber. Resolves only after all cleanup has settled, including
   * async disposers and the recursive disposal of children.
   */
  dispose(): Promise<void> {
    this.disposeRequested = true;
    return this.enqueue(async () => {
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
  }
}
