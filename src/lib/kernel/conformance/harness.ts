// harness.ts — executes the language-neutral conformance fixtures against the
//   TypeScript kernel.
// Created: 2026-08-24 — Implements the harness contract in
//   conformance/README.md: build a fresh root context per fixture, turn each
//   declarative plugin entry into a real plugin, run the steps in order, record
//   the trace, and compare it to `expect_trace` exactly. Unknown ops and
//   unknown fields fail loudly — a fixture the harness does not understand is a
//   failure, never a skip.

import { Context, EffectRejectedError, type Plugin } from '../index.js';

/* ------------------------------------------------------------------ types */

export interface ListenerDecl {
  event: string;
  mode: 'emit' | 'waterfall' | 'parallel' | 'serial';
  id: string;
  action: 'delegate' | 'shortcircuit' | 'wrap';
  wrap?: string;
  value?: unknown;
}

export interface PluginDecl {
  provides?: string[];
  inject?: { required?: string[]; optional?: string[] };
  effects?: string[];
  listeners?: ListenerDecl[];
  children?: string[];
  apply_throws?: boolean;
  apply_delay_ms?: number;
  dispose_delay_ms?: number;
  effect_during_dispose?: string;
  record_resolved?: string[];
}

export interface StepDecl {
  op?: string;
  plugin?: string;
  under?: string;
  scope?: string;
  service?: string;
  value?: unknown;
  event?: string;
  mode?: 'emit' | 'waterfall' | 'parallel' | 'serial';
  nowait?: boolean;
  expect_state?: Record<string, string>;
  expect_result?: unknown;
}

export interface Fixture {
  id: string;
  asserts: string;
  semantics: string;
  plugins: Record<string, PluginDecl>;
  steps: StepDecl[];
  expect_trace?: string[];
  expect_trace_unordered?: string[];
}

const FIXTURE_FIELDS = new Set([
  'id',
  'asserts',
  'semantics',
  'plugins',
  'steps',
  'expect_trace',
  'expect_trace_unordered',
]);
const PLUGIN_FIELDS = new Set([
  'provides',
  'inject',
  'effects',
  'listeners',
  'children',
  'apply_throws',
  'apply_delay_ms',
  'dispose_delay_ms',
  'effect_during_dispose',
  'record_resolved',
]);
const INJECT_FIELDS = new Set(['required', 'optional']);
const LISTENER_FIELDS = new Set(['event', 'mode', 'id', 'action', 'wrap', 'value']);
const STEP_FIELDS = new Set([
  'op',
  'plugin',
  'under',
  'scope',
  'service',
  'value',
  'event',
  'mode',
  'nowait',
  'expect_state',
  'expect_result',
]);
const OPS = new Set([
  'mount',
  'dispose',
  'dispose_nowait',
  'provide',
  'withdraw',
  'dispatch',
  'settle',
  'isolate',
]);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function checkFields(where: string, obj: object, allowed: Set<string>): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) throw new Error(`conformance: unknown field "${key}" in ${where}`);
  }
}

/** Validate a fixture's shape before running it. Unknown anything is a failure. */
export function validateFixture(fixture: Fixture): void {
  checkFields(`fixture ${fixture.id}`, fixture, FIXTURE_FIELDS);
  if (!fixture.expect_trace && !fixture.expect_trace_unordered) {
    throw new Error(`conformance: fixture ${fixture.id} declares no expected trace`);
  }
  for (const [name, decl] of Object.entries(fixture.plugins ?? {})) {
    checkFields(`plugin ${name}`, decl, PLUGIN_FIELDS);
    if (decl.inject) checkFields(`plugin ${name}.inject`, decl.inject, INJECT_FIELDS);
    for (const listener of decl.listeners ?? []) {
      checkFields(`plugin ${name} listener ${listener.id}`, listener, LISTENER_FIELDS);
    }
  }
  for (const [i, step] of (fixture.steps ?? []).entries()) {
    checkFields(`step ${i}`, step, STEP_FIELDS);
    if (step.op !== undefined && !OPS.has(step.op)) {
      throw new Error(`conformance: unknown op "${step.op}" in step ${i}`);
    }
    if (step.op === undefined && step.expect_state === undefined) {
      throw new Error(`conformance: step ${i} has neither an op nor an assertion`);
    }
  }
}

/* --------------------------------------------------------------- execution */

export interface RunResult {
  trace: string[];
  /** Assertion failures collected while running, empty when conformant. */
  failures: string[];
}

export async function runFixture(fixture: Fixture): Promise<RunResult> {
  validateFixture(fixture);

  const trace: string[] = [];
  const failures: string[] = [];
  const root = Context.root();
  const runtime = root.runtime;
  runtime.onTrace = (token) => trace.push(token);

  const scopes = new Map<string, Context>([['root', root]]);
  const fibers = new Map<string, ReturnType<Context['plugin']>>();
  const detached: Promise<unknown>[] = [];

  const buildPlugin = (name: string): Plugin => {
    const decl = fixture.plugins[name];
    if (!decl) throw new Error(`conformance: fixture ${fixture.id} has no plugin "${name}"`);
    return {
      name,
      inject: decl.inject,
      apply: async (ctx: Context) => {
        for (const service of decl.provides ?? []) ctx.provide(service, `${name}impl`);

        for (const service of decl.record_resolved ?? []) {
          trace.push(`${name}:resolved:${service}:${String(ctx.get(service))}`);
        }

        (decl.effects ?? []).forEach((id, index) => {
          ctx.effect(() => {
            trace.push(`${name}:effect:${id}:setup`);
            return async () => {
              if (decl.dispose_delay_ms) await sleep(decl.dispose_delay_ms);
              trace.push(`${name}:effect:${id}:dispose`);
              // Dragon: a registration attempted from inside cleanup must be
              // refused, or it escapes the unload snapshot and leaks. Attached
              // to the first-registered effect, which disposes last.
              if (index === 0 && decl.effect_during_dispose) {
                const late = decl.effect_during_dispose;
                try {
                  ctx.effect(() => {
                    trace.push(`${name}:effect:${late}:setup`);
                  });
                } catch (err) {
                  if (!(err instanceof EffectRejectedError)) throw err;
                  trace.push(`${name}:effect:${late}:rejected`);
                }
              }
            };
          });
        });

        for (const listener of decl.listeners ?? []) {
          ctx.on(listener.event, listener.mode, ((value: unknown, next?: () => unknown) => {
            trace.push(`${name}:listener:${listener.id}:enter`);
            let result: unknown;
            if (listener.action === 'shortcircuit') {
              result = listener.value;
            } else {
              const delegated = next ? next() : value;
              result =
                listener.action === 'wrap' ? `${listener.wrap}(${String(delegated)})` : delegated;
            }
            trace.push(`${name}:listener:${listener.id}:exit`);
            return result;
          }) as never);
        }

        for (const childName of decl.children ?? []) {
          const child = ctx.plugin(buildPlugin(childName));
          fibers.set(childName, child);
          await child.ready();
        }

        if (decl.apply_delay_ms) await sleep(decl.apply_delay_ms);

        if (decl.apply_throws) {
          trace.push(`${name}:apply:throw`);
          throw new Error(`${name}: apply failed`);
        }
      },
    };
  };

  const contextFor = (step: StepDecl): Context => {
    if (step.under) {
      const parent = fibers.get(step.under);
      if (!parent) throw new Error(`conformance: no mounted plugin "${step.under}"`);
      return parent.ctx;
    }
    const scope = scopes.get(step.scope ?? 'root');
    if (!scope) throw new Error(`conformance: no scope "${step.scope}"`);
    return scope;
  };

  const settle = async () => {
    await runtime.settle();
    await Promise.all(detached);
    await runtime.settle();
  };

  for (const [i, step] of fixture.steps.entries()) {
    switch (step.op) {
      case undefined:
        break;
      case 'mount': {
        const name = step.plugin!;
        const fiber = contextFor(step).plugin(buildPlugin(name));
        fibers.set(name, fiber);
        if (step.nowait) {
          detached.push(fiber.ready());
        } else {
          await fiber.ready();
          await runtime.flush();
        }
        break;
      }
      case 'dispose': {
        const fiber = fibers.get(step.plugin!);
        if (!fiber) throw new Error(`conformance: no mounted plugin "${step.plugin}"`);
        await fiber.dispose();
        break;
      }
      case 'dispose_nowait': {
        const fiber = fibers.get(step.plugin!);
        if (!fiber) throw new Error(`conformance: no mounted plugin "${step.plugin}"`);
        detached.push(fiber.dispose());
        break;
      }
      case 'provide': {
        contextFor(step).provide(step.service!, step.value ?? true);
        await runtime.flush();
        break;
      }
      case 'withdraw': {
        contextFor(step).withdraw(step.service!);
        await runtime.flush();
        break;
      }
      case 'isolate': {
        const name = step.scope!;
        scopes.set(name, root.isolate(step.service!, name));
        break;
      }
      case 'dispatch': {
        const bus = root.bus;
        let result: unknown;
        if (step.mode === 'waterfall') result = bus.waterfall(step.event!, step.value);
        else if (step.mode === 'serial') result = await bus.serial(step.event!, step.value);
        else if (step.mode === 'parallel') await bus.parallel(step.event!, step.value);
        else bus.emit(step.event!, step.value);
        if ('expect_result' in step && result !== step.expect_result) {
          failures.push(
            `step ${i}: expected result ${JSON.stringify(step.expect_result)}, got ${JSON.stringify(result)}`,
          );
        }
        break;
      }
      case 'settle':
        await settle();
        break;
      default:
        throw new Error(`conformance: unknown op "${step.op}"`);
    }

    if (step.expect_state) {
      for (const [name, expected] of Object.entries(step.expect_state)) {
        const actual = fibers.get(name)?.state;
        if (actual !== expected) {
          failures.push(`step ${i}: expected ${name} to be ${expected}, got ${actual ?? 'absent'}`);
        }
      }
    }
  }

  await settle();
  return { trace, failures };
}
