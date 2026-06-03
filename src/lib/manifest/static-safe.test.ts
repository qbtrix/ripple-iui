// @file manifest/static-safe.test.ts
// @created 2026-06-03 — Paw Sites landing brain (Phase R / Task R2).
// Asserts the 7 Tier-0 (pure-CSS) animation widgets carry staticSafe: true so
// the landing builder can use animated polish on a static (csr=false) site
// without tripping the SSR gate. reveal/parallax/spotlight need client JS and
// must NOT be flagged. Authoritative tier source: src/lib/motion/engine.ts;
// this flag only surfaces that fact into the manifest the builder reads.
import { describe, it, expect } from 'vitest';
import { manifestEntries } from './index.js';

const TIER0 = ['aurora', 'marquee', 'border-beam', 'shimmer', 'animated-beam', 'text-effect', 'bento-grid'];
const CLIENT_JS = ['reveal', 'parallax', 'spotlight'];

describe('static-safe (Tier-0) animation widgets', () => {
  it('flags Tier-0 animated widgets as static-safe', () => {
    for (const n of TIER0) {
      const e = manifestEntries.find((w) => w.type === n);
      expect(e, `${n} missing`).toBeTruthy();
      expect(e!.staticSafe, `${n} staticSafe`).toBe(true);
    }
  });

  it('does not flag client-JS animation widgets as static-safe', () => {
    for (const n of CLIENT_JS) {
      const e = manifestEntries.find((w) => w.type === n);
      if (e) {
        expect(e.staticSafe, `${n} must not be static-safe`).not.toBe(true);
      }
    }
  });
});
