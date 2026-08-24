// context.ts — the service repository of the paw composition kernel.
// Created: 2026-08-24 — SEMANTICS.md §1 (context, resolution by key, child
//   contexts, isolate) and §3 (effects: every registration is reversible).
//   Services live in cells shared down the context chain; `isolate(key)` gives
//   a child its own cell for that key while every other key still resolves
//   through the parent.

import { EventBus, type DispatchMode, type Listener } from './events.js';
import { Fiber } from './fiber.js';
import { Runtime } from './runtime.js';

/** A disposer returned by an effect's setup body. May be async. */
export type Disposer = () => void | Promise<void>;

/** What `ctx.effect()` hands back: an idempotent early-disposal handle. */
export type EffectHandle = () => Promise<void>;

/** A unit of composition. `apply` receives the plugin's own context. */
export interface Plugin {
  name: string;
  inject?: { required?: string[]; optional?: string[] };
  apply: (ctx: Context) => void | Promise<void>;
}

/**
 * Thrown by `ctx.effect()` when the owning fiber is UNLOADING. Rejecting here
 * is what stops a cleanup-time registration from escaping the unload snapshot
 * and leaking (SEMANTICS §3, dragon).
 */
export class EffectRejectedError extends Error {
  constructor(owner: string) {
    super(`kernel: effect rejected — "${owner}" is UNLOADING`);
    this.name = 'EffectRejectedError';
  }
}

/** One service slot. Shared by every context that resolves the key to it. */
class Cell {
  value: unknown = undefined;
}

export class Context {
  readonly runtime: Runtime;
  readonly bus: EventBus;
  /** Trace owner label: `root`, an isolate scope name, or a plugin name. */
  readonly label: string;
  readonly parent: Context | null;
  /** The fiber that owns this context, if it is a plugin context. */
  readonly fiber: Fiber | null;

  private readonly cells = new Map<string, Cell>();

  constructor(
    runtime: Runtime,
    label: string,
    parent: Context | null = null,
    fiber: Fiber | null = null,
    bus?: EventBus,
  ) {
    this.runtime = runtime;
    this.label = label;
    this.parent = parent;
    this.fiber = fiber;
    this.bus = bus ?? parent?.bus ?? new EventBus();
  }

  /** Create a fresh root context with its own runtime. */
  static root(): Context {
    return new Context(new Runtime(), 'root', null, null, new EventBus());
  }

  private cellFor(key: string): Cell {
    const own = this.cells.get(key);
    if (own) return own;
    if (this.parent) return this.parent.cellFor(key);
    const created = new Cell();
    this.cells.set(key, created);
    return created;
  }

  /** Resolve a service by key. Absent keys yield `undefined`, never a throw. */
  get(key: string): unknown {
    return this.cellFor(key).value;
  }

  /** A plain child context: inherits every service, owns no new scope. */
  extend(label = this.label): Context {
    return new Context(this.runtime, label, this, null);
  }

  /**
   * A child context in which `key` resolves against a fresh scope. The parent
   * is unaffected; every other key still resolves through the parent.
   */
  isolate(key: string, label: string): Context {
    const child = new Context(this.runtime, label, this, null);
    child.cells.set(key, new Cell());
    return child;
  }

  /** Internal: the context handed to a plugin's `apply`. */
  createPluginContext(label: string, fiber: Fiber): Context {
    return new Context(this.runtime, label, this, fiber);
  }

  /**
   * Publish a service. Inside a plugin this is an effect, so the service is
   * withdrawn again when that plugin unloads (SEMANTICS §1, §3).
   */
  provide(key: string, value: unknown = true): void {
    const cell = this.cellFor(key);
    if (this.fiber) {
      this.effect(() => {
        cell.value = value;
        this.runtime.trace(`${this.label}:provide:${key}`);
        this.runtime.notifyAll();
        return () => {
          if (cell.value !== value) return;
          cell.value = undefined;
          this.runtime.trace(`${this.label}:withdraw:${key}`);
          this.runtime.notifyAll();
        };
      });
      return;
    }
    cell.value = value;
    this.runtime.trace(`${this.label}:provide:${key}`);
    this.runtime.notifyAll();
  }

  /** Withdraw a service published on this context's scope. */
  withdraw(key: string): void {
    const cell = this.cellFor(key);
    cell.value = undefined;
    this.runtime.trace(`${this.label}:withdraw:${key}`);
    this.runtime.notifyAll();
  }

  /**
   * Run a reversible registration. `setup` may return a disposer, which runs
   * at most once, in LIFO order relative to its siblings, on unload.
   *
   * Throws {@link EffectRejectedError} if the owning fiber is UNLOADING.
   * Creation while PENDING or LOADING stays legal.
   */
  effect(setup: () => Disposer | void): EffectHandle {
    const owner = this.fiber;
    if (owner?.state === 'UNLOADING') throw new EffectRejectedError(owner.name);
    const disposer = setup();
    let done = false;
    const handle: EffectHandle = async () => {
      if (done) return;
      done = true;
      if (disposer) await disposer();
    };
    owner?.collect(handle);
    return handle;
  }

  /** Register an event listener. Registration is an effect (SEMANTICS §5). */
  on(event: string, mode: DispatchMode, fn: Listener): EffectHandle {
    return this.effect(() => this.bus.on(event, mode, fn));
  }

  /** Mount a plugin as a child of this context. Mounting is an effect. */
  plugin(plugin: Plugin): Fiber {
    return new Fiber(this, plugin);
  }
}
