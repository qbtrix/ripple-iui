// @file ui/theme-aliases.test.ts
// @description NEW (2026-09-17, fix/port-gaps). ripple's status red used to be
//   a hard-coded `--ripple-error: oklch(0.65 0.22 25)` while seventeen widgets
//   painted red through the host's `--destructive`. The two agreed in
//   paw-enterprise light mode and split in dark, where the host lifts
//   `--destructive` for dark glass. The decision (translation doc §7, option a)
//   is that the host's `--destructive` is canonical and `--ripple-error` aliases
//   it, the same way `--ripple-accent` aliases `--primary`. This pins that alias
//   so the hard-coded value cannot drift back in.
import { test, expect } from 'vitest';

test('theme.css aliases the ripple error pair to the host destructive pair', async () => {
  // vitest empties every .css import, `?raw` included, so read the file itself.
  // Tests run from the package root. ripple's tsconfig carries no node types.
  // @ts-ignore
  const { readFileSync } = await import('node:fs');
  const css: string = readFileSync('src/lib/theme.css', 'utf8');
  expect(css.length).toBeGreaterThan(0);
  expect(css).toMatch(/--ripple-error:\s*var\(--destructive\);/);
  expect(css).toMatch(/--ripple-error-foreground:\s*var\(--destructive-foreground\);/);
});
