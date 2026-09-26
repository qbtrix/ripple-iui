# `@paw/kernel` — the paw composition kernel (TypeScript)

Created 2026-08-24. A small, dependency-free implementation of the paw
composition semantics. It lives inside ripple for now; it imports nothing from
ripple and nothing in ripple imports it yet. Wiring it into rendering is a
later slice.

The normative spec is **`paw-workspace/paw-compose/SEMANTICS.md`** (v0.1.0).
This package is a *runtime* of that spec; where the two disagree, the spec wins.
Semantics lineage: [Cordis](https://github.com/cordiverse/cordis) (MIT, Shigma)
— ported semantics, not code.

## What it gives you

| File | Role |
|---|---|
| `context.ts` | service repository (§1), `isolate`, and reversible effects (§3) |
| `fiber.ts` | the per-plugin lifecycle FSM (§4), including both dragons |
| `events.ts` | four dispatch modes (§5); waterfall is around-middleware |
| `runtime.ts` | shared tree state: trace sink, fiber registry, reconcile queue |

```ts
import { Context } from '$lib/kernel';

const root = Context.root();

root.plugin({
  name: 'greeter',
  inject: { required: ['logger'] },
  apply(ctx) {
    ctx.provide('greet', (who: string) => `hi ${who}`); // reversible
    ctx.effect(() => {
      const timer = setInterval(tick, 1000);
      return () => clearInterval(timer); // runs on unload, LIFO, at most once
    });
  },
});
```

Three rules worth internalising before using it:

- **One authority per key per scope.** Publishing a key already live in the
  same scope is rejected — `provide` throws, and inside `apply` that rolls the
  offending plugin back to `FAILED` while the incumbent and its dependents
  carry on untouched. Sequential publication is fine. To run a second
  implementation of a key, `isolate(key)` it; that is what the primitive is
  for, and providers in different scopes never collide.
- **Every registration is reversible.** `provide`, `on`, and child mounts are all
  effects. Anything you register outside `ctx.effect()` leaks.
- **Load order comes from injection, never from mount order.** A plugin whose
  required services are absent sits in `PENDING` and activates itself when they
  appear. Withdrawing one returns it to `PENDING`, not `DISPOSED` — it
  re-activates if the service comes back.
- **`dispose()` resolves only when cleanup has actually finished** — async
  disposers awaited, children disposed before the parent's own effects. A
  disposer that throws does not stop the ones behind it: unwinding completes,
  the fiber reaches its target state, and `dispose()` rejects with what failed
  (an `AggregateError` when several did). `dispose()` is **total**: a FAILED
  fiber has nothing to unwind, but the caller asked for disposal and disposal
  completed, so the handle still retires to `DISPOSED`.

## Conformance

`conformance/` runs the 19 language-neutral fixtures as vitest cases (upstream
`006d1df`). The trace must match `expect_trace` exactly; there are no skips.

```bash
bunx vitest run --project client src/lib/kernel
```

## Runtime-specific obligations (SEMANTICS §7a)

Passing the shared fixtures is not sufficient. §7a requires each runtime to
cover the hazards its own language has, in its own suite, and to say so here.
For TypeScript that is `runtime-obligations.test.ts`:

- **Cancellation — not applicable.** Python's obligation (a disposer must
  survive `CancelledError`) has no analogue: JavaScript promises do not cancel.
- **Unhandled rejection — covered.** A detached `dispose()` whose disposer
  rejects would take a Node host down under the default policy, so every step
  of a fiber's task chain attaches a handler and retains the error on
  `fiber.error`. Verified by mutation: dropping that `catch` produces a real
  unhandled rejection and fails the test. This has to coexist with §3's
  "observable, never swallowed": `dispose()` returns a promise that rejects
  *and* is pre-handled, so awaiting it surfaces the failure while ignoring it
  cannot crash the host, and the aggregate goes to `runtime.onError` regardless.
- **Aggregating several teardown errors — covered.** §3 requires all of them,
  not just the first. TypeScript's carrier is `AggregateError`; that choice is
  language-specific, which is why it is asserted here rather than in a fixture.
- **Concurrent scheduler — covered.** `parallel` genuinely fans out. The shared
  `parallel-awaits-all` proves it via a 4x delay margin; the native test repeats
  it margin-free. Verified by mutation: awaiting listeners in turn fails both.

## Known limitations

- Fixtures are **vendored** (copied) from `paw-compose/conformance/`; see
  `conformance/README.md`. A freshness check is a follow-up.
- ~~A throwing disposer aborts the rest of the LIFO chain.~~ **Fixed.** Found
  here while writing the §7a tests, reproduced independently on the Python
  runtime, then specified as §3's fourth dragon and covered by
  `disposer-throws-still-unwinds`. Kept in this list as history: the two
  runtimes had *diverged* on it — Python raised out of `dispose()`, this one
  resolved silently — because the spec was silent, which is the drift the
  shared suite exists to catch.
- `ctx.effect()` collects its disposer wrapper *after* `setup` returns; the
  hardened Cordis fork registers it *before*, so an unload begun from inside a
  setup body awaits that setup's own cleanup. No MUST covers this and no
  fixture exercises it — tracked upstream as a spec gap, deliberately not
  patched here so the fix can be proven by a fixture rather than asserted.
- **Mounting into a disposed or tearing-down parent is not rejected.** Such a
  child would never be torn down, because the parent has already unwound its
  children list. Found by review, deferred deliberately — no fixture covers it
  and the fix wants a spec rule first, the same way the disposer-error dragon
  did.
- No `./kernel` entry in `package.json#exports` yet — deliberately left out to
  avoid colliding with concurrent work on that file. Import via `$lib/kernel`
  inside the repo.
- Not wired into rendering.
