// scripts/check-no-toplevel-anim-imports.test.ts
// @file scripts/check-no-toplevel-anim-imports.test.ts
// @description Vitest coverage for the workerd-SSR lint gate. Unit-tests the
//   static-import matcher (flags `import ... from 'motion'`, ignores dynamic
//   `import('motion')`, respects the allowlist, treats gsap as banned) and an
//   integration check that asserts the real source tree currently passes.
// @created 2026-05-30 — RFC 12 animation primitive, Task 1.10.

import { describe, expect, it } from 'vitest';
import { findTopLevelAnimImports, BANNED_ENGINES, ALLOWLIST } from './check-no-toplevel-anim-imports.js';

describe('no top-level animation-engine imports (workerd-SSR contract)', () => {
  it('flags a static top-level `import ... from "motion"`', () => {
    const offenders = findTopLevelAnimImports('foo.ts', `import { animate } from 'motion';\nexport const x = 1;`);
    expect(offenders.length).toBe(1);
  });

  it('does NOT flag a dynamic import inside a function', () => {
    const offenders = findTopLevelAnimImports('foo.ts', `export async function f() { const m = await import('motion'); return m; }`);
    expect(offenders).toEqual([]);
  });

  it('does NOT flag the allowlisted loader even if it dynamic-imports motion', () => {
    const path = ALLOWLIST[0];
    const offenders = findTopLevelAnimImports(path, `export async function load() { return import('motion'); }`);
    expect(offenders).toEqual([]);
  });

  it('flags gsap as a banned baseline engine', () => {
    expect(BANNED_ENGINES).toContain('gsap');
    const offenders = findTopLevelAnimImports('foo.ts', `import gsap from 'gsap';`);
    expect(offenders.length).toBe(1);
  });

  it('the real source tree passes the gate (integration)', async () => {
    const { runGate } = await import('./check-no-toplevel-anim-imports.js');
    const result = runGate();
    expect(result.offenders, JSON.stringify(result.offenders, null, 2)).toEqual([]);
  });
});
