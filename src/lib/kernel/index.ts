// index.ts — public surface of the paw composition kernel.
// Created: 2026-08-24 — Re-exports Context (service repository + effects),
//   Fiber (lifecycle), the event bus, and the Runtime. The normative spec is
//   paw-workspace/paw-compose/SEMANTICS.md; conformance/ holds the fixtures
//   that decide whether this implementation is a conformant runtime.

export { Context, EffectRejectedError } from './context.js';
export type { Disposer, EffectHandle, Plugin } from './context.js';
export { Fiber } from './fiber.js';
export type { FiberState } from './fiber.js';
export { EventBus } from './events.js';
export type { DispatchMode, Listener, PlainListener, WaterfallListener } from './events.js';
export { Runtime } from './runtime.js';
export type { TraceSink } from './runtime.js';
