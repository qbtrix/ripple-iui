# Conformance fixtures — VENDORED COPY

Created 2026-08-24. Re-copied 2026-08-24 at upstream commit `88a2730`
(13 → 16 fixtures).

**Source of truth: `paw-workspace/paw-compose/conformance/`.** The JSON files in
`fixtures/` are a copy, because the spec lives in a different repo and there is
no cross-repo import yet. Do not edit them here — a fixture change belongs
upstream, then gets re-copied.

Known limitation: nothing checks that this copy is current. A freshness check
(CI step, or a script that diffs against the spec repo) is a follow-up. This
round made the cost concrete: the fixtures were amended upstream and this copy
had to be refreshed by hand.

## What runs here

- `fixtures/*.json` — the 16 fixtures, verbatim.
- `harness.ts` — turns a declarative fixture into real plugins, runs the steps,
  records the trace.
- `conformance.test.ts` — one vitest case per fixture.

The harness follows the contract in the upstream `conformance/README.md`:

- The trace is compared to `expect_trace` **exactly** — same tokens, same order.
  `expect_trace_unordered` is compared as a multiset (parallel dispatch only).
- Unknown ops, unknown fields, unknown listener actions, and a missing fixture
  file all fail loudly. A fixture the harness does not understand is a failure,
  never a skip. The expected fixture count is asserted as its own test case.

## Ordering inside `apply` — normative upstream since `88a2730`

```
provides → record_resolved → effects → listeners → children
         → apply_delay_ms → effects_after_delay → apply_throws
```

Plus two rules one mechanism cannot satisfy together, both now in the upstream
README:

- **Child mounts during `apply` load inline** — awaited within the parent's
  `apply` (`nested-recursive-dispose`).
- **Activation triggered by a newly provided service is deferred** — queued and
  drained only after the providing plugin settles (`load-order-inject`).

## Remaining harness conventions the fixture format leaves open

- `UNLOADING` is entered only after `apply` has settled, so an effect created
  late in `apply` is still legal (§3: creation while `PENDING`/`LOADING` is
  legal) while one created from inside cleanup is rejected. Upstream adopted
  this reading; `effects_after_delay` now depends on it.
- `effect_during_dispose` attaches to the first-registered effect's disposer,
  which under LIFO runs last. When a plugin declares only
  `effects_after_delay`, "first-registered" means the first of those.
- Dispatch emits no trace token of its own; a dispatch result is checked only
  via `expect_result`.
- A listener with `delay_ms` is registered as an async body, so it can only be
  used with the awaited modes (`parallel`, `serial`), never `waterfall`.

## Note on `parallel-awaits-all`

It is compared as a multiset, so it proves every listener ran and that dispatch
did not resolve before they settled — but it cannot distinguish a genuinely
concurrent fan-out from one that awaits each listener in turn. Both produce the
same token multiset. Worth an upstream fixture that can tell them apart.
