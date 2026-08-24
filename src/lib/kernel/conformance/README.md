# Conformance fixtures — VENDORED COPY

Created 2026-08-24. Re-copied 2026-08-24 at upstream commit `9ec61f2`
(13 → 16 fixtures; `parallel-awaits-all` then re-cut as an ordered trace).

**Re-copying is not enough on its own — commit the copy before you test
against it.** A vendored fixture edited but not committed is reverted by
`git checkout -- fixtures`, which silently puts an older expectation back
under a test that appears to be exercising the new one.

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
- `expect_trace_unordered` (multiset compare) is still supported but is used by
  **no** fixture as of `9ec61f2`. Treat that as the standing warning: an
  unordered compare hides mechanism. `parallel-awaits-all` was unordered and a
  strictly sequential `parallel` passed it; once ordered, the same mutation
  fails. Do not reach for it without a reason no delay margin can fix.
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

## Note on `parallel-awaits-all` — the one timing-dependent fixture

Its listeners delay 20ms and 5ms, so genuine fan-out produces a deterministic
interleaving (`L1:enter, L2:enter, L2:exit, L1:exit`) while awaiting them in
turn produces `L1:enter, L1:exit, L2:enter, L2:exit`. The 4x margin is the
safety factor. If it ever goes flaky under load, raise the margin upstream —
do not switch it back to an unordered compare, which is what made it blind in
the first place.
