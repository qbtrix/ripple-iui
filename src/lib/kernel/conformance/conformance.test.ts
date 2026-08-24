// conformance.test.ts — runs every conformance fixture against the kernel.
// Created: 2026-08-24 — One vitest case per fixture. The trace must match
//   `expect_trace` exactly (same tokens, same order); `expect_trace_unordered`
//   is compared as a multiset and is only legal for parallel dispatch. The
//   fixture count is asserted so a missing file fails instead of silently
//   shrinking the suite.

import { describe, expect, it } from 'vitest';
import { runFixture, type Fixture } from './harness.js';

// Updated: 2026-08-24 — fixture amendment 88a2730 raised the count to 16:
// three new dispatch-mode fixtures, plus two amended so they can actually fail.
const EXPECTED_FIXTURE_COUNT = 16;

// Vite's glob import works under jsdom, where fs paths derived from
// import.meta.url do not.
const modules = import.meta.glob('./fixtures/*.json', { eager: true }) as Record<
  string,
  { default: Fixture }
>;

const files = Object.keys(modules).sort();
const fixtures: Fixture[] = files.map((name) => modules[name].default);

describe('paw composition kernel — conformance', () => {
  it('loads every fixture', () => {
    expect(files.length).toBe(EXPECTED_FIXTURE_COUNT);
  });

  for (const fixture of fixtures) {
    it(`${fixture.id}: ${fixture.asserts}`, async () => {
      const { trace, failures } = await runFixture(fixture);
      expect(failures).toEqual([]);
      if (fixture.expect_trace_unordered) {
        expect([...trace].sort()).toEqual([...fixture.expect_trace_unordered].sort());
      } else {
        expect(trace).toEqual(fixture.expect_trace);
      }
    });
  }
});
