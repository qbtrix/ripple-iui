// events.ts — typed event bus for the paw composition kernel.
// Created: 2026-08-24 — Four dispatch modes per SEMANTICS.md §5: emit,
//   waterfall (around-middleware with next()), parallel, serial. A listener's
//   mode is part of the event's contract and must not vary by call site.

/** Dispatch modes. An event has exactly one, fixed at registration. */
export type DispatchMode = 'emit' | 'waterfall' | 'parallel' | 'serial';

/** A waterfall listener: receives the value plus a `next` delegate. */
export type WaterfallListener = (value: unknown, next: () => unknown) => unknown;

/** Any other listener: receives the value. */
export type PlainListener = (value: unknown) => unknown;

export type Listener = WaterfallListener | PlainListener;

interface Entry {
  mode: DispatchMode;
  fn: Listener;
}

/**
 * Event bus. Registration order is the dispatch order for every mode except
 * `parallel`, which fans out concurrently.
 */
export class EventBus {
  private readonly entries = new Map<string, Entry[]>();

  /** Register a listener. Returns the remover; callers wrap it in an effect. */
  on(event: string, mode: DispatchMode, fn: Listener): () => void {
    const list = this.entries.get(event) ?? [];
    for (const entry of list) {
      if (entry.mode !== mode) {
        throw new Error(
          `kernel: event "${event}" is dispatched as "${entry.mode}"; cannot also register "${mode}"`,
        );
      }
    }
    const entry: Entry = { mode, fn };
    list.push(entry);
    this.entries.set(event, list);
    return () => {
      const current = this.entries.get(event);
      if (!current) return;
      const i = current.indexOf(entry);
      if (i >= 0) current.splice(i, 1);
    };
  }

  private listeners(event: string, mode: DispatchMode): Entry[] {
    const list = this.entries.get(event) ?? [];
    if (list.length && list[0].mode !== mode) {
      throw new Error(
        `kernel: event "${event}" is dispatched as "${list[0].mode}", not "${mode}"`,
      );
    }
    return list.slice();
  }

  /** Fire-and-forget observation. Returns nothing, awaits nothing. */
  emit(event: string, value: unknown): void {
    for (const entry of this.listeners(event, 'emit')) {
      (entry.fn as PlainListener)(value);
    }
  }

  /**
   * Around-middleware. Each listener may call `next()` to delegate to the rest
   * of the chain and wrap the result, or return without calling it to
   * short-circuit. With no listeners the dispatched value is returned as-is.
   */
  waterfall(event: string, value: unknown): unknown {
    const list = this.listeners(event, 'waterfall');
    const run = (i: number): unknown => {
      if (i >= list.length) return value;
      return (list[i].fn as WaterfallListener)(value, () => run(i + 1));
    };
    return run(0);
  }

  /** Fan out concurrently and await every listener. */
  async parallel(event: string, value: unknown): Promise<void> {
    await Promise.all(
      this.listeners(event, 'parallel').map((entry) =>
        Promise.resolve((entry.fn as PlainListener)(value)),
      ),
    );
  }

  /** Ordered; the first non-absent result wins and stops the chain. */
  async serial(event: string, value: unknown): Promise<unknown> {
    for (const entry of this.listeners(event, 'serial')) {
      const result = await (entry.fn as PlainListener)(value);
      if (result !== undefined && result !== null) return result;
    }
    return undefined;
  }
}
