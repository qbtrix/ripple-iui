# Conformance fixtures — VENDORED COPY

Created 2026-08-24.

**Source of truth: `paw-workspace/paw-compose/conformance/`.** The JSON files in
`fixtures/` are a copy taken on 2026-08-24, because the spec lives in a
different repo and there is no cross-repo import yet. Do not edit them here — a
fixture change belongs upstream, then gets re-copied.

Known limitation: nothing checks that this copy is current. A freshness check
(CI step or a script that diffs against the spec repo) is a follow-up.

## What runs here

- `fixtures/*.json` — the 13 fixtures, verbatim.
- `harness.ts` — turns a declarative fixture into real plugins, runs the steps,
  records the trace.
- `conformance.test.ts` — one vitest case per fixture.

The harness follows the contract in the upstream `conformance/README.md`:

- The trace is compared to `expect_trace` **exactly** — same tokens, same order.
  `expect_trace_unordered` is compared as a multiset (parallel dispatch only).
- Unknown ops, unknown fields, and a missing fixture file all fail loudly. A
  fixture the harness does not understand is a failure, never a skip. The
  expected fixture count is asserted as its own test case.

## Harness conventions the fixture format leaves open

The fixture format does not pin these down; the traces do. Recorded here so a
future edit does not silently reinterpret them:

- `apply` runs in this order: `provides` → `record_resolved` → `effects` →
  `listeners` → `children` → `apply_delay_ms` → `apply_throws`.
- `UNLOADING` is entered only after `apply` has settled, so an effect created
  late in `apply` is still legal (§3: creation while `PENDING`/`LOADING` is
  legal) while one created from inside cleanup is rejected.
- `effect_during_dispose` is attempted from inside the first-registered
  effect's disposer, which under LIFO runs last.
- Child mounts during `apply` load inline (awaited by the parent's `apply`);
  activation triggered by a service appearing is deferred to the runtime queue
  and drains after the providing fiber has settled.
- Dispatch itself emits no trace token; a dispatch result is checked only via
  `expect_result`.
