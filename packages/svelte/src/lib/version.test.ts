/**
 * @file version.test.ts
 * @description Release-drift guard for src/lib/version.ts: RIPPLE_VERSION (the
 *   plain constant the client/manifest path uses) MUST equal package.json's
 *   version. Importing package.json HERE is safe — this test runs in
 *   Node/vitest and never enters the browser bundle, which is exactly why the
 *   manifest stopped importing it directly (see version.ts / manifest/index.ts).
 *   If a release bumps package.json without bumping version.ts (or vice-versa),
 *   this fails loudly.
 * @created 2026-06-28 (SP-1c-b — feat/ripple-editor-sp1cb)
 */
import { describe, it, expect } from 'vitest';
import pkg from '../../package.json' with { type: 'json' };
import { RIPPLE_VERSION } from './version.js';

describe('RIPPLE_VERSION', () => {
  it('matches package.json version (release drift guard)', () => {
    expect(RIPPLE_VERSION).toBe(pkg.version);
  });
});
